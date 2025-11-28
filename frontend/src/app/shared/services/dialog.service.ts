import { Injectable, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DialogService {
    private dialog = inject(Dialog);

    async confirm(message: string): Promise<boolean> {
        const dialogRef = this.dialog.open<boolean>(ConfirmationDialogComponent, {
            data: { message },
        });

        const result = await firstValueFrom(dialogRef.closed);
        return result === true;
    }
}
