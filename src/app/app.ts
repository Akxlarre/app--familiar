import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SearchShortcutDirective } from '@core/directives/search-shortcut.directive';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SearchShortcutDirective],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
