// Copyright (C) 2016-2020 Sergey Akopkokhyants
// This project is licensed under the terms of the MIT license.
// https://github.com/akserg/ng2-dnd

import { ChangeDetectorRef, NgZone, OnDestroy, Renderer2 } from '@angular/core';
import { Directive, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { auditTime, Subject, takeUntil } from 'rxjs';

import { AbstractComponent } from './abstract.component';
import { DragDropAllowedOperation, DragDropConfig } from './dnd.config';
import { DragDropService, DragDropData } from './dnd.service';

interface ModifyClassEvent {
    operation: 'add' | 'remove';
    element: HTMLElement;
    classNames: string[];
}

@Directive({ selector: '[dnd-droppable]' })
export class DroppableComponent extends AbstractComponent implements OnDestroy {
    private destroyed = new Subject<void>();
    private modifyClassSubject = new Subject<ModifyClassEvent>();

    @Input("dropEnabled") set droppable(value: boolean) {
        this.dropEnabled = !!value;
    }

    /**
     * Callback function called when the drop action completes correctly.
     * It is activated before the on-drag-success callback.
     */
    @Output() onDropSuccess: EventEmitter<DragDropData> = new EventEmitter<DragDropData>();
    @Output() onDragEnter: EventEmitter<DragDropData> = new EventEmitter<DragDropData>();
    @Output() onDragOver: EventEmitter<DragDropData> = new EventEmitter<DragDropData>();
    @Output() onDragLeave: EventEmitter<DragDropData> = new EventEmitter<DragDropData>();

    @Input("allowDrop") set allowdrop(value: (dropData: any) => boolean) {
        this.allowDrop = value;
    }

    @Input("dropZones") set dropzones(value: Array<string>) {
        this.dropZones = value;
    }

    /**
     * Drag allowed effect
     */
    @Input("effectAllowed") set effectallowed(value: DragDropAllowedOperation) {
        this.effectAllowed = value;
    }

    /**
     * Drag effect cursor
     */
    @Input("effectCursor") set effectcursor(value: string) {
        this.effectCursor = value;
    }

    constructor(
        elemRef: ElementRef,
        dragDropService: DragDropService,
        config: DragDropConfig,
        cdr: ChangeDetectorRef,
        private renderer: Renderer2,
        zone: NgZone) {

        super(elemRef, dragDropService, config, cdr, renderer, zone);

        this.dropEnabled = true;

        this.modifyClassSubject
            .pipe(takeUntil(this.destroyed), auditTime(100))
            .subscribe(event => event.classNames
                .forEach(className => this.renderer[`${event.operation}Class`](event.element, className)));
    }

    private addClass(element: HTMLElement, ...classNames: string[]) {
        this.modifyClassSubject.next({ operation: 'add', element, classNames });
    }

    private removeClass(element: HTMLElement, ...classNames: string[]) {
        this.modifyClassSubject.next({ operation: 'remove', element, classNames });
    }

    public override ngOnDestroy(): void {
        super.ngOnDestroy();
        this.destroyed.next();
        this.destroyed.complete();
    }

    override _onDragEnterCallback(event: MouseEvent) {
        if (this._dragDropService.isDragged) {
            this.addClass(this._elem, this._config.onDragEnterClass);
            this.onDragEnter.emit({ dragData: this._dragDropService.dragData, mouseEvent: event });
        }
    }

    override _onDragOverCallback(event: MouseEvent) {
        if (this._dragDropService.isDragged) {
            this.addClass(this._elem, this._config.onDragOverClass);
            this.onDragOver.emit({ dragData: this._dragDropService.dragData, mouseEvent: event });
        }
    };

    override _onDragLeaveCallback(event: MouseEvent) {
        if (this._dragDropService.isDragged) {
            this.removeClass(this._elem, this._config.onDragOverClass, this._config.onDragEnterClass);
            this.onDragLeave.emit({ dragData: this._dragDropService.dragData, mouseEvent: event });
        }
    };

    override _onDropCallback(event: MouseEvent) {
        let dataTransfer = (event as any).dataTransfer;
        if (this._dragDropService.isDragged || (dataTransfer && dataTransfer.files)) {
            this.onDropSuccess.emit({ dragData: this._dragDropService.dragData, mouseEvent: event });
            if (this._dragDropService.onDragSuccessCallback) {
                this._dragDropService.onDragSuccessCallback.emit({ dragData: this._dragDropService.dragData, mouseEvent: event });
            }
            this.removeClass(this._elem, this._config.onDragOverClass, this._config.onDragEnterClass);

        }
    }
}

