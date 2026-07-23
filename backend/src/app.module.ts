import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { StudiesModule } from './studies/studies.module';
import { SessionsModule } from './sessions/sessions.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { VisuospatialModule } from './visuospatial/visuospatial.module';
import { AbstractionModule } from './abstraction/abstraction.module';
import { DelayedRecallModule } from './delayed-recall/delayed-recall.module';
import { OrientationModule } from './orientation/orientation.module';
import { AttentionModule } from './attention/attention.module';
import { LanguageModule } from './language/language.module';
import { TranscribeModule } from './transcribe/transcribe.module';
import { TtsModule } from './tts/tts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI') || 'mongodb://localhost:27017/moca',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PatientsModule,
    StudiesModule,
    SessionsModule,
    EvaluationsModule,
    VisuospatialModule,
    AbstractionModule,
    DelayedRecallModule,
    OrientationModule,
    AttentionModule,
    LanguageModule,
    TranscribeModule,
    TtsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
