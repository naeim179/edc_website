import { prepareVideoUpload } from "@/lib/video-uploads";
export async function POST(request: Request) {
  return prepareVideoUpload(request, "bunny");
}
