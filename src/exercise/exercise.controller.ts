import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActorGuard } from 'src/common/guards/actor.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentActor } from 'src/common/decorators/current-user.decorator';
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import {
  CreateExerciseDto,
  ExerciseListQueryDto,
} from './dto/create-exercise.dto';
import { ExerciseResponseDto } from './dto/exercise-response.dto';
import { ExercisesService } from './exercise.service';
import { MediaService } from './media.service';

/** Coinciden con MEDIA_LIMITS del cliente móvil. */
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista el catálogo de ejercicios' })
  findAll(@Query() query: ExerciseListQueryDto) {
    return this.exercisesService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Categorías disponibles',
    description:
      'La app agrega el chip "Todos" en el cliente; la API sólo devuelve las que se pueden persistir.',
  })
  categories() {
    return this.exercisesService.listCategories();
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Detalle de un ejercicio por su código estable' })
  @ApiResponse({ status: 200, type: ExerciseResponseDto })
  findOneByCode(@Param('code') code: string) {
    return this.exercisesService.findOneByCode(code);
  }

  @Get(':ref')
  @ApiOperation({
    summary: 'Detalle de un ejercicio',
    description: 'Acepta el código estable (`exercise_01`) o el id numérico.',
  })
  @ApiResponse({ status: 200, type: ExerciseResponseDto })
  findOne(@Param('ref') ref: string) {
    return this.exercisesService.findOneById(ref);
  }

  @Post()
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Crea un ejercicio' })
  @ApiResponse({ status: 201, type: ExerciseResponseDto })
  create(@Body() dto: CreateExerciseDto, @CurrentActor() actor: Actor) {
    return this.exercisesService.create(dto, actor.uuid);
  }

  @Put(':ref')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Actualiza un ejercicio' })
  update(@Param('ref') ref: string, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.update(ref, dto);
  }

  @Patch(':ref/deactivate')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({
    summary: 'Da de baja un ejercicio',
    description:
      'Baja lógica: los ejercicios ya usados en sesiones no se pueden borrar.',
  })
  deactivate(@Param('ref') ref: string) {
    return this.exercisesService.deactivate(ref);
  }

  /**
   * Upload de video del ejercicio.
   *
   * Es el endpoint que la app ya consume
   * (`POST /exercises/media/video`, multipart, máx 100 MB).
   */
  @Post('media/video')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: VIDEO_MAX_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube el video de un ejercicio (máx 100 MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.storeVideo(file);
  }

  @Post('media/image')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE_MAX_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube la imagen de portada de un ejercicio (máx 5 MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  uploadCoverImage(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.storeCoverImage(file);
  }
}