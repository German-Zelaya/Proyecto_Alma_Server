import { Injectable } from '@nestjs/common';

@Injectable()
export class BedrockService {
  async getEmpatheticResponse(text: string): Promise<string> {
    // Mock para desarrollo local — reemplazar con llamada real a Bedrock en producción
    return (
      `Entiendo cómo te sientes y es completamente válido sentirse así ante lo que describes. ` +
      `Estoy aquí contigo y confío en tu capacidad para atravesar esto con gentileza. ` +
      `Permítete sentir sin juzgarte, cada emoción tiene su lugar y su tiempo.`
    );
  }
}
