import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class DialogService {

    async confirm(message: string): Promise<boolean> {
        const result = await Swal.fire({
            title: 'Confirmação',
            html: `
                <div class="window-body">
                    <p>${message}</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Sim',
            cancelButtonText: 'Não',
            buttonsStyling: false,
            customClass: {
                popup: 'window-modal',
                title: 'window-title',
                confirmButton: 'window-btn-primary',
                cancelButton: 'window-btn-secondary',
            },
            backdrop: 'rgba(0,0,0,0.4)',
            showCloseButton: true,
            width: '480px',
            padding: '0',
            reverseButtons: true
        });

        return result.isConfirmed;
    }
}
