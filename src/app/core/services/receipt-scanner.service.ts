import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { ReceiptScanResult } from '@core/models/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class ReceiptScannerService {
  private supabase = inject(SupabaseService);

  /**
   * Llama a la Edge Function `scan-receipt-inventory` para extraer items
   * de una boleta almacenada en el bucket `receipts`.
   *
   * Usa supabase.functions.invoke para que el SDK adjunte correctamente
   * el JWT de sesión y el apikey del proyecto.
   */
  async scanReceipt(storagePath: string, householdId: string): Promise<{
    data?: ReceiptScanResult;
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client.functions.invoke('scan-receipt-inventory', {
      body: { storage_path: storagePath, household_id: householdId },
    });

    if (error) return { error: error as unknown as Error };
    return { data: data as ReceiptScanResult, error: null };
  }
}

