type AudioUploadProps = {
  referenceFile: File | null;
  mixFile: File | null;
  onReferenceChange: (file: File | null) => void;
  onMixChange: (file: File | null) => void;
};

function UploadCard({
  title,
  description,
  file,
  onFile,
}: {
  title: string;
  description: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <label
      className="upload-card"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files[0] ?? null);
      }}
    >
      <span className="upload-icon" aria-hidden="true">
        {file ? "✓" : "＋"}
      </span>
      <span className="upload-copy">
        <strong>{title}</strong>
        <span>{file ? file.name : description}</span>
      </span>
      <span className="upload-action">{file ? "Change file" : "Browse"}</span>
      <input
        type="file"
        accept="audio/*"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        aria-label={title}
      />
    </label>
  );
}

export default function AudioUpload({
  referenceFile,
  mixFile,
  onReferenceChange,
  onMixChange,
}: AudioUploadProps) {
  return (
    <section className="upload-grid" aria-label="Audio files">
      <UploadCard
        title="Reference track"
        description="Drop your reference audio here or choose a file"
        file={referenceFile}
        onFile={onReferenceChange}
      />
      <UploadCard
        title="Your mix"
        description="Drop your mix here or choose a file"
        file={mixFile}
        onFile={onMixChange}
      />
    </section>
  );
}
