"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";


async function assertAdmin() {

  const supabase = await createClient();

  const {
    data:{ user },
  } = await supabase.auth.getUser();


  if (!user) {
    throw new Error("Unauthorized");
  }


  const { data: profile } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();


  if (profile?.role !== "admin") {
    throw new Error("Only admins");
  }

}




function calculateFinalPrice(
  price:number,
  discountType:string,
  discountValue:number
) {

  if (!discountType || discountValue <= 0) {
    return price;
  }


  if (discountType === "percentage") {

    return Number(
      (
        price -
        (price * discountValue / 100)
      ).toFixed(2)
    );

  }


  if (discountType === "fixed") {

    return Number(
      Math.max(
        price - discountValue,
        0
      ).toFixed(2)
    );

  }


  return price;

}




export async function createCourseOffer(
  courseId:string,
  formData:FormData
) {

  await assertAdmin();


  const admin = createAdminClient();


  const type =
    String(formData.get("type") ?? "");


  const price =
    Number(formData.get("price") ?? 0);


  const discountType =
    String(
      formData.get("discount_type") ?? ""
    );


  const discountValue =
    Number(
      formData.get("discount_value") ?? 0
    );



  if (
    !["group","private"]
      .includes(type)
  ) {
    throw new Error(
      "Invalid offer type"
    );
  }



  const finalPrice =
    calculateFinalPrice(
      price,
      discountType,
      discountValue
    );



  const { error } =
    await admin
      .from("course_offers")
      .insert({

        course_id:courseId,

        type,

        price,

        discount_type:
          discountType || null,

        discount_value:
          discountValue,

        final_price:
          finalPrice,

      });



  if(error){
    throw new Error(
      error.message
    );
  }



  revalidatePath(
    `/admin/courses/${courseId}/offers`
  );

}




export async function updateCourseOffer(
  offerId:string,
  courseId:string,
  formData:FormData
){

  await assertAdmin();


  const admin =
    createAdminClient();


  const price =
    Number(
      formData.get("price") ?? 0
    );


  const discountType =
    String(
      formData.get("discount_type") ?? ""
    );


  const discountValue =
    Number(
      formData.get("discount_value") ?? 0
    );


  const finalPrice =
    calculateFinalPrice(
      price,
      discountType,
      discountValue
    );



  const {error} =
    await admin
      .from("course_offers")
      .update({

        price,

        discount_type:
          discountType || null,

        discount_value:
          discountValue,

        final_price:
          finalPrice,

      })
      .eq(
        "id",
        offerId
      );



  if(error){
    throw new Error(
      error.message
    );
  }



  revalidatePath(
    `/admin/courses/${courseId}/offers`
  );

}





export async function assignTeacherToOffer(
  offerId:string,
  teacherId:string,
  courseId:string
){

  await assertAdmin();


  const admin =
    createAdminClient();


  const {error} =
    await admin
      .from("course_instructors")
      .insert({

        offer_id:offerId,

        teacher_id:teacherId,

        course_id:courseId,

      });



  if(
    error &&
    error.code !== "23505"
  ){

    throw new Error(
      error.message
    );

  }



  revalidatePath(
    `/admin/courses/${courseId}/offers`
  );

}


export async function deleteCourseOffer(
  offerId:string,
  courseId:string
){

  await assertAdmin();


  const admin =
    createAdminClient();


  const { error } =
    await admin
      .from("course_offers")
      .delete()
      .eq(
        "id",
        offerId
      );


  if(error){
    throw new Error(
      error.message
    );
  }


  revalidatePath(
    `/admin/courses/${courseId}/offers`
  );

}
