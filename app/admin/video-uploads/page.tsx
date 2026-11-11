import AppShell from "@/components/AppShell";
import { getStaleVideoUploads } from "@/app/actions/video-upload-cleanup";
import VideoUploadCleanup from "@/components/admin/VideoUploadCleanup";
export default async function VideoUploadsPage() {
  const uploads = await getStaleVideoUploads();
  return (
    <AppShell>
      <VideoUploadCleanup uploads={uploads} />
    </AppShell>
  );
}
