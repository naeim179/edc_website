import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import BuyCourseButton from "@/components/BuyCourseButton";


export default async function CheckoutPage({
 params,
}:{
 params:Promise<{courseId:string}>
}){

 const {courseId}=await params;

 const supabase=await createClient();


 const {data:course}=await supabase
 .from("courses")
 .select(`
 title,
 price,
 currency
 `)
 .eq("id",courseId)
 .maybeSingle();



 if(!course){
  return null;
 }


 return (
 <AppShell>

 <div className="max-w-xl mx-auto bg-white rounded-2xl border p-8 text-right">

 <h1 className="text-2xl font-bold">
 {course.title}
 </h1>


 <p className="mt-4 text-lg">
 السعر:
 <strong>
 {" "}
 {course.price} {course.currency}
 </strong>
 </p>


 <div className="mt-6">

 <BuyCourseButton courseId={courseId}/>

 </div>


 </div>

 </AppShell>
 );

}
