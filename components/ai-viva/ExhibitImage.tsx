"use client";

type Props = {
  src: string;
  label: string;
  onClose: () => void;
};

export function ExhibitImage({ src, label, onClose }: Props) {
  return (
    <div className="relative bg-black rounded-xl p-4 max-w-4xl">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white text-sm bg-black/60 px-3 py-1 rounded"
      >
        Close
      </button>

      <div className="text-sm text-neutral-300 mb-2">{label}</div>

      <img
        src={src}
        alt={label}
        className="max-h-[70vh] w-auto rounded-lg"
      />
    </div>
  );
}
