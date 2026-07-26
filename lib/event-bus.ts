// lib/event-bus.ts — EventBus para comunicação desacoplada entre hooks (PRD v2.0 seção 5 — Performance)

import type { EventTypes } from "../types/common.types";

type EventKey = keyof EventTypes;
type Handler<T> = (payload: T) => void;

/**
 * EventBus simples para invalidação de cache entre hooks.
 * Sem polling, sem setInterval — os hooks invalidam cache quando um evento relevante é emitido.
 * Preparado para WebSocket/SSE no futuro: basta plugar um WebSocket que emite os mesmos eventos.
 */
class EventBus {
  private handlers: Map<EventKey, Set<Handler<unknown>>> = new Map();

  /** Registra um handler para um evento */
  on<K extends EventKey>(event: K, handler: Handler<EventTypes[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as Handler<unknown>);

    // Retorna função de unregister
    return () => this.off(event, handler);
  }

  /** Registra um handler que só dispara uma vez */
  once<K extends EventKey>(event: K, handler: Handler<EventTypes[K]>): () => void {
    const wrapper: Handler<EventTypes[K]> = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /** Remove um handler específico */
  off<K extends EventKey>(event: K, handler: Handler<EventTypes[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  /** Emite um evento para todos os handlers registrados */
  emit<K extends EventKey>(event: K, payload?: EventTypes[K]): void {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(payload as unknown);
        } catch (e) {
          console.error(`[EventBus] Erro no handler do evento "${event}":`, e);
        }
      });
    }
  }

  /** Remove todos os handlers de um evento específico (ou todos se omitido) */
  clear(event?: EventKey): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

/** Instância singleton do EventBus */
export const eventBus = new EventBus();

/** Re-export da classe para testes */
export { EventBus };
