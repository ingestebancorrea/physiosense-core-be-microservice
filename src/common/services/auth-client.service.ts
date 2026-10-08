import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ErrorMessages } from '../enum/error-messages.enum';
import { DominantHand } from '../enum/profile-role.enum';

/**
 * Rol del usuario en authentication-be-microservice, tal como lo devuelven las
 * tablas `roles` ('FIS' fisioterapeuta / 'PAC' paciente).
 */
export interface AuthUserProfile {
  user_id: number;
  username: string;
  full_name: string;
  image_url: string | null;
  is_active: boolean;
  role_id: number;
  role_alias: string | null;
  /** `patients.patient_id` de auth. Null si el usuario no es paciente. */
  patient_id: number | null;
  /** `physiotherapists.physiotherapist_id` de auth. Null si no es fisio. */
  physiotherapist_id: number | null;
}

/** Identidad del paciente tal como la expone authentication-be-microservice. */
export interface AuthPatientProfile {
  patient_id: number;
  user_id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  birth_date: string;
  country: string;
  city: string;
  dominant_hand: DominantHand;
  phone: string | null;
  notes: string | null;
}

/** Identidad del fisioterapeuta tal como la expone auth. */
export interface AuthTherapistProfile {
  physiotherapist_id: number;
  user_id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  specialty: string;
  license_number: string;
  institution: string | null;
  years_of_experience: number;
  phone: string | null;
  notes: string | null;
}

/** Vida util de la cache de perfiles. */
const CACHE_TTL_MS = 60_000;
/** Timeout por llamada: auth caido no debe colgar el request de la app. */
const REQUEST_TIMEOUT_MS = 5_000;
/** El token de servicio se pide de nuevo antes de vencer. */
const SERVICE_TOKEN_TTL_S = 600;
const SERVICE_TOKEN_REFRESH_MARGIN_S = 60;

interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<FetchResponse>;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Cliente del microservicio de autenticacion.
 *
 * Este servicio ya no tiene tabla `patients` ni `therapists`: identidad,
 * rol y fisioterapeutas se resuelven contra `AUTH_SERVICE_URL`. Tres
 * particularidades:
 *
 *  * **Cache corta (60 s)**: `ActorGuard` y las listas llaman a auth en cada
 *    request; sin cache cada lectura pagada al otro servicio.
 *  * **Token de servicio**: los endpoints de auth exigen JWT, asi que este
 *    cliente firma el suyo con el `JWT_SECRET` que ya comparten los dos
 *    servicios. No hay ningun secreto nuevo que rotar.
 *  * **Fallos explicitos**: un 404 de auth se traduce en el mensaje de error
 *    del dominio y un error de red en 503, para que la app no reciba un 500
 *    opaco cuando el servicio de autenticacion esta caido.
 */
@Injectable()
export class AuthClient {
  private readonly cache = new Map<string, CacheEntry>();
  private serviceToken?: { value: string; expiresAt: number };

  constructor(private readonly jwtService: JwtService) {}

  /** Rol y ids de perfil de un usuario (`GET /users/:id/profile`). */
  async getUserProfile(userId: number): Promise<AuthUserProfile> {
    return this.request<AuthUserProfile>(`users/${userId}/profile`, {
      cacheKey: `user-profile:${userId}`,
      notFoundMessage: ErrorMessages.FORBIDDEN_ROLE,
    });
  }

  /** Ficha de paciente (`GET /patients/:id`). */
  async getPatient(patientId: number): Promise<AuthPatientProfile> {
    return this.request<AuthPatientProfile>(`patients/${patientId}`, {
      cacheKey: `patient:${patientId}`,
      notFoundMessage: ErrorMessages.PATIENT_NOT_FOUND,
    });
  }

  /** Todos los pacientes (`GET /patients`), cacheados. */
  async getPatients(): Promise<AuthPatientProfile[]> {
    return this.request<AuthPatientProfile[]>('patients', {
      cacheKey: 'patients',
      notFoundMessage: ErrorMessages.PATIENT_NOT_FOUND,
    });
  }

  /** Subconjunto de `getPatients()`, para pintar una pagina sin traer todo. */
  async getPatientsByIds(
    patientIds: number[],
  ): Promise<Map<number, AuthPatientProfile>> {
    const wanted = new Set(patientIds.filter((id) => Number.isInteger(id)));
    if (wanted.size === 0) return new Map();

    const patients = await this.getPatients();
    return new Map(
      patients
        .filter((patient) => wanted.has(patient.patient_id))
        .map((patient) => [patient.patient_id, patient]),
    );
  }

  /** Ficha del fisioterapeuta (`GET /physiotherapists/:id`). */
  async getTherapist(therapistId: number): Promise<AuthTherapistProfile> {
    return this.request<AuthTherapistProfile>(`physiotherapists/${therapistId}`, {
      cacheKey: `therapist:${therapistId}`,
      notFoundMessage: ErrorMessages.THERAPIST_NOT_FOUND,
    });
  }

  /** Todos los fisioterapeutas (`GET /physiotherapists`), cacheados. */
  async getTherapists(): Promise<AuthTherapistProfile[]> {
    return this.request<AuthTherapistProfile[]>('physiotherapists', {
      cacheKey: 'therapists',
      notFoundMessage: ErrorMessages.THERAPIST_NOT_FOUND,
    });
  }

  /** Subconjunto de `getTherapists()`, para nombres de una pagina. */
  async getTherapistsByIds(
    therapistIds: number[],
  ): Promise<Map<number, AuthTherapistProfile>> {
    const wanted = new Set(therapistIds.filter((id) => Number.isInteger(id) && id > 0));
    if (wanted.size === 0) return new Map();

    const therapists = await this.getTherapists();
    return new Map(
      therapists
        .filter((therapist) => wanted.has(therapist.physiotherapist_id))
        .map((therapist) => [therapist.physiotherapist_id, therapist]),
    );
  }

  /**
   * Lanza 404 si el paciente no existe en auth.
   *
   * Es el reemplazo de `assertPatientExists()`: la existencia ya no se mira en
   * una tabla local sino en el servicio que es dueno del perfil.
   */
  async assertPatient(patientId: number): Promise<AuthPatientProfile> {
    return this.getPatient(patientId);
  }

  /** Lanza 404 si el fisioterapeuta no existe en auth. */
  async assertTherapist(therapistId: number): Promise<AuthTherapistProfile> {
    return this.getTherapist(therapistId);
  }

  /** Vacia la cache. Solo para tests. */
  clearCache(): void {
    this.cache.clear();
    this.serviceToken = undefined;
  }

  private async request<T>(
    path: string,
    options: { cacheKey?: string; notFoundMessage?: string } = {},
  ): Promise<T> {
    const { cacheKey, notFoundMessage } = options;

    if (cacheKey) {
      const hit = this.cache.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value as T;
      }
      if (hit) this.cache.delete(cacheKey);
    }

    const baseUrl = this.baseUrl();
    const token = await this.getServiceToken();

    let response: FetchResponse;
    try {
      response = await this.fetchImpl()(`${baseUrl}/${path}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: this.timeoutSignal(),
      });
    } catch (error) {
      throw this.unavailable(error);
    }

    if (response.status === 404) {
      throw new NotFoundException(notFoundMessage ?? ErrorMessages.NOT_FOUND);
    }

    if (!response.ok) {
      throw this.unavailable(new Error(`auth respondio ${response.status}`));
    }

    let payload: T;
    try {
      payload = (await response.json()) as T;
    } catch (error) {
      throw this.unavailable(error);
    }

    if (cacheKey) {
      this.cache.set(cacheKey, { value: payload, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return payload;
  }

  private baseUrl(): string {
    const baseUrl = process.env.AUTH_SERVICE_URL?.replace(/\/+$/, '');

    if (!baseUrl) {
      throw new ServiceUnavailableException(
        `${ErrorMessages.AUTH_SERVICE_UNAVAILABLE} (falta AUTH_SERVICE_URL)`,
      );
    }

    return baseUrl;
  }

  /**
   * Token de servicio: los endpoints de auth exigen JWT y este microservicio
   * comparte el `JWT_SECRET`, asi que puede emitir el suyo. Sirve para llamar
   * como servicio; no da acceso a nada que el resto de usuarios no tenga.
   */
  private async getServiceToken(): Promise<string> {
    const now = Date.now();

    if (
      this.serviceToken &&
      this.serviceToken.expiresAt - SERVICE_TOKEN_REFRESH_MARGIN_S * 1000 > now
    ) {
      return this.serviceToken.value;
    }

    const value = await this.jwtService.signAsync(
      {
        uuid: 0,
        username: 'physiosense-core',
        name: 'PhysioSense Core',
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: SERVICE_TOKEN_TTL_S,
        algorithm: 'HS256',
      },
    );

    this.serviceToken = { value, expiresAt: now + SERVICE_TOKEN_TTL_S * 1000 };
    return value;
  }

  private timeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS).unref?.();
    return controller.signal;
  }

  private unavailable(cause: unknown): ServiceUnavailableException {
    return new ServiceUnavailableException({
      message: ErrorMessages.AUTH_SERVICE_UNAVAILABLE,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
  }

  /**
   * `fetch` global (Node >= 18). Se referencia via `globalThis` y se tipa a
   * mano porque `@types/node@18` todavia no declara `fetch`.
   */
  private fetchImpl(): FetchLike {
    const impl = (globalThis as { fetch?: FetchLike }).fetch;

    if (typeof impl !== 'function') {
      throw this.unavailable(new Error('Node sin fetch global (requiere Node >= 18)'));
    }

    return (url, init) => impl.call(globalThis, url, init);
  }
}
