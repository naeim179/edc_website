import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import OfferForm from "./OfferForm";
import AssignOfferTeacher from "./AssignOfferTeacher";
import EditOfferForm from "./EditOfferForm";
import { deleteCourseOffer } from "@/app/actions/course-offers";


export default async function CourseOffersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = await params;

  const supabase = await createClient();



  const { data: offers } =
    await supabase
      .from("course_offers")
      .select(`
        id,
        type,
        price,
        discount_type,
        discount_value,
        final_price,

        course_instructors (
          teacher:profiles (
            id,
            full_name
          )
        )
      `)
      .eq("course_id", id);



  const { data: teachers } =
    await supabase
      .from("profiles")
      .select(`
        id,
        full_name
      `)
      .eq("role", "teacher")
      .order("created_at", {
        ascending:false,
      });



  return (

    <AppShell>

      <div
        className="max-w-5xl mx-auto p-6 space-y-6"
        dir="rtl"
      >


        <h1 className="text-2xl font-bold">
          إدارة عروض الدورة
        </h1>



        <OfferForm
          courseId={id}
        />



        <div className="bg-white border rounded-xl p-6">

          <h2 className="font-bold mb-5">
            العروض الحالية
          </h2>



          <div className="space-y-5">


          {offers?.map((offer)=>{


            return (

              <div
                key={offer.id}
                className="border rounded-2xl p-5 space-y-4"
              >


                <div className="flex justify-between">


                  <h3 className="font-bold text-lg">
                    {
                      offer.type === "group"
                      ? "Group - قروب"
                      : "Private - خاص"
                    }
                  </h3>


                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    {offer.type}
                  </span>


                </div>



                <div>

                  <p>
                    السعر الأساسي:
                    {" "}
                    {offer.price} JOD
                  </p>


                  {offer.discount_value > 0 && (

                    <p className="text-red-600 font-bold">
                      خصم:
                      {" "}
                      {offer.discount_value}
                      %
                    </p>

                  )}



                  <p className="font-bold text-lg mt-2">
                    السعر النهائي:
                    {" "}
                    {offer.final_price ?? offer.price}
                    {" "}
                    JOD
                  </p>


                </div>




                <EditOfferForm

                  offerId={offer.id}

                  courseId={id}

                  price={offer.price}

                  discountType={
                    offer.discount_type ?? null
                  }

                  discountValue={
                    offer.discount_value ?? 0
                  }

                />


                <div className="bg-slate-50 rounded-xl p-4">

                  <p className="font-bold mb-3">
                    المعلمين المعينين:
                  </p>


                  {offer.course_instructors?.length ? (

                    offer.course_instructors.map((item)=>{

                      const teacher =
                        item.teacher?.[0];


                      if(!teacher){
                        return null;
                      }


                      return (
                        <p
                          key={teacher.id}
                          className="text-slate-700"
                        >
                          👨‍🏫 {teacher.full_name}
                        </p>
                      );

                    })

                  ) : (

                    <p className="text-slate-500">
                      لا يوجد معلم معين
                    </p>

                  )}

                </div>


                <AssignOfferTeacher

                  courseId={id}

                  offerId={offer.id}

                  teachers={teachers ?? []}

                  currentTeacher=""
                />


                <form
                  action={async () => {
                    "use server";

                    await deleteCourseOffer(
                      offer.id,
                      id
                    );
                  }}
                >

                  <button
                    type="submit"
                    className="bg-red-50 text-red-600 px-5 py-2 rounded-xl font-bold"
                  >
                    حذف العرض
                  </button>

                </form>


              </div>

            );

          })}


          </div>


        </div>


      </div>


    </AppShell>

  );

}
