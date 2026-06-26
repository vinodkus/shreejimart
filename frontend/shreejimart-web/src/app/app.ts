import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { CartService } from './cart/cart.service';
import { CustomerAuthService } from './auth/customer-auth.service';
import { ProductSearchComponent } from './components/product-search';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NgIf, ProductSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  readonly customerAuth = inject(CustomerAuthService);

  readonly cartCount = this.cart.itemCount;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  isAdminRoute() {
    const path = this.url() ?? '';
    return path.startsWith('/admin') && !path.startsWith('/admin/login');
  }

  isLoginRoute() {
    return (this.url() ?? '').startsWith('/admin/login');
  }
}
