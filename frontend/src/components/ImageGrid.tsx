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
import type { ImageFile } from "../types";

function SortableRow({ item, onRemove }: { item: ImageFile; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-500 select-none">⠿⠿</span>
      <span className="text-sm text-gray-300 flex-1 truncate">{item.file.name}</span>
      <span className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
      <button onClick={onRemove} className="text-red-400 hover:text-red-200 text-sm">✕</button>
    </div>
  );
}

interface Props {
  images: ImageFile[];
  onReorder: (images: ImageFile[]) => void;
  onRemove: (id: string) => void;
}

export function ImageGrid({ images, onReorder, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((i) => i.id === active.id);
      const newIndex = images.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {images.map((item) => (
            <SortableRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
