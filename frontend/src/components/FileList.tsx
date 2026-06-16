import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

export interface FileListItem {
    id: string;
    file: File;
}

function SortableRow({
    item,
    onRemove,
}: {
    item: FileListItem;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({
            id: item.id,
        });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2"
        >
            <span
                {...attributes}
                {...listeners}
                className="cursor-grab text-gray-500 select-none"
                aria-label="Arrastar"
            >
                <GripVertical className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-gray-300">
                {item.file.name}
            </span>
            <span className="shrink-0 text-xs text-gray-500">
                {(item.file.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
                onClick={onRemove}
                className="shrink-0 text-red-400 hover:text-red-200"
                aria-label={`Remover ${item.file.name}`}
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}

interface Props<T extends FileListItem> {
    items: T[];
    onReorder: (items: T[]) => void;
    onRemove: (id: string) => void;
}

export function FileList<T extends FileListItem>({
    items,
    onReorder,
    onRemove,
}: Props<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            onReorder(arrayMove(items, oldIndex, newIndex));
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-2">
                    {items.map((item) => (
                        <SortableRow
                            key={item.id}
                            item={item}
                            onRemove={() => onRemove(item.id)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
