import {
  sendVideoUpload,
  videoUploadStatus,
  cancelVideoUpload,
} from "@/lib/video-uploads";
type Context = { params: Promise<{ uploadId: string }> };
const course = (request: Request) =>
  new URL(request.url).searchParams.get("courseId") ?? "";
export async function PUT(request: Request, { params }: Context) {
  return sendVideoUpload(request, (await params).uploadId, course(request));
}
export async function GET(request: Request, { params }: Context) {
  return videoUploadStatus((await params).uploadId, course(request));
}
export async function DELETE(request: Request, { params }: Context) {
  return cancelVideoUpload((await params).uploadId, course(request));
}
