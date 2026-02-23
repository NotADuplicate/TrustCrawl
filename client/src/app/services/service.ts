import { ChangeDetectorRef } from "@angular/core";

export class Service {
    cdr?: ChangeDetectorRef;
    public registerChangeDetector(cdr: ChangeDetectorRef) {
        this.cdr = cdr;
    }

    public refresh() {
        if (this.cdr) {
            this.cdr.detectChanges();
        } else {
            console.warn('ChangeDetectorRef not registered, cannot refresh view');
        }
    }
}