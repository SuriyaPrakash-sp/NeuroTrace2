import { Camera } from "lucide-react";

export function CameraPermissionState({ granted, onRequest }: { granted: boolean; onRequest: () => void }) {
  if (granted) return null;
  return (
    <div className="card p-5 text-center">
      <Camera className="mx-auto mb-2 text-navy-400" size={32} />
      <h3 className="font-bold text-navy-900">Camera Access</h3>
      <p className="text-sm text-navy-700 mt-1 mb-4">
        Camera is used for real-time hand tracking and posture guidance during tracing exercises.
      </p>
      <button className="btn-primary" onClick={onRequest}>
        Enable Camera
      </button>
    </div>
  );
}

export default CameraPermissionState;
