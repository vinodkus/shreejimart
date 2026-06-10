import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { ApiClient, Order } from '../api/api-client';

const POLL_INTERVAL_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class AdminOrderAlertService implements OnDestroy {
  private readonly api = inject(ApiClient);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private knownOrderIds = new Set<string>();
  private initialized = false;

  readonly soundEnabled = signal(this.loadSoundPreference());
  readonly pendingCount = signal(0);
  readonly newOrderAlert = signal<string | null>(null);
  readonly lastNewOrderAt = signal(0);

  startPolling() {
    if (this.pollTimer) return;
    this.checkOrders();
    this.pollTimer = setInterval(() => this.checkOrders(), POLL_INTERVAL_MS);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  toggleSound() {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem('shreejimart_admin_order_sound', next ? '1' : '0');
    if (next) this.playNewOrderSound();
  }

  enableSound() {
    if (!this.soundEnabled()) this.toggleSound();
    else this.playNewOrderSound();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private checkOrders() {
    this.api.listOrders().subscribe({
      next: (orders) => {
        this.pendingCount.set(orders.filter((o) => o.status === 'Pending').length);
        this.handleNewOrders(orders);
      },
      error: () => {},
    });
  }

  private handleNewOrders(orders: Order[]) {
    const ids = orders.map((o) => o.id);

    if (!this.initialized) {
      this.knownOrderIds = new Set(ids);
      this.initialized = true;
      return;
    }

    const newOrders = orders.filter((o) => !this.knownOrderIds.has(o.id));
    if (newOrders.length === 0) return;

    for (const id of ids) this.knownOrderIds.add(id);

    const label =
      newOrders.length === 1
        ? `New order from ${newOrders[0].customerName || 'Guest'} · ₹${newOrders[0].totalAmount}`
        : `${newOrders.length} new orders received`;

    this.newOrderAlert.set(label);
    this.lastNewOrderAt.set(Date.now());
    window.setTimeout(() => this.newOrderAlert.set(null), 8000);

    if (this.soundEnabled()) this.playNewOrderSound();
  }

  private playNewOrderSound() {
    try {
      const ctx = new AudioContext();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const t = ctx.currentTime;
      playTone(880, t, 0.14);
      playTone(1175, t + 0.16, 0.22);
      playTone(1480, t + 0.34, 0.28);
      void ctx.close();
    } catch {
      // Browser may block audio until user interaction
    }
  }

  private loadSoundPreference() {
    return localStorage.getItem('shreejimart_admin_order_sound') !== '0';
  }
}
