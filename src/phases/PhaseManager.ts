export enum GamePhase {
  Sea = 'Sea',
  Evaporation = 'Evaporation',
  Cloud = 'Cloud',
  Rain = 'Rain',
  Landing = 'Landing',
  Plants = 'Plants',
}

export interface PhasePayload {
  hitPlantIndex?: number;
}

export class PhaseManager {
  currentPhase: GamePhase = GamePhase.Sea;
  onTransition: (prev: GamePhase, next: GamePhase, payload?: PhasePayload) => void = () => {};

  transition(next: GamePhase, payload?: PhasePayload): void {
    const prev = this.currentPhase;
    this.currentPhase = next;
    console.debug(`[PhaseManager] ${prev} → ${next}`);
    this.onTransition(prev, next, payload);
  }
}

