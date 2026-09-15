import { redirect } from "next/navigation";
import { getUserRole } from "./get-user-role";

export async function requireTeacher() {
  const role = await getUserRole();

  if (role !== "teacher" && role !== "admin") {
    redirect("/");
  }

  return role;
}
