"use client";

import {
  createCourseOffer
} from "@/app/actions/course-offers";

export default function OfferForm({
  courseId,
}: {
  courseId:string;
}) {


  const action =
    createCourseOffer.bind(
      null,
      courseId
    );


  return (

    <form
      action={action}
      className="bg-white border rounded-xl p-6 space-y-5"
      dir="rtl"
    >


      <h2 className="text-lg font-bold">
        إضافة عرض جديد
      </h2>



      <div>

        <label className="block font-bold mb-2">
          نوع العرض
        </label>


        <select
          name="type"
          required
          className="w-full border rounded-xl px-4 py-3"
        >

          <option value="">
            اختر النوع
          </option>

          <option value="group">
            Group - قروب
          </option>


          <option value="private">
            Private - خاص
          </option>


        </select>

      </div>




      <div>

        <label className="block font-bold mb-2">
          السعر الأساسي
        </label>


        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          className="w-full border rounded-xl px-4 py-3"
        />


      </div>





      <div>

        <label className="block font-bold mb-2">
          نوع الخصم
        </label>


        <select
          name="discount_type"
          className="w-full border rounded-xl px-4 py-3"
        >

          <option value="">
            بدون خصم
          </option>


          <option value="percentage">
            نسبة مئوية %
          </option>


          <option value="fixed">
            مبلغ ثابت
          </option>


        </select>


      </div>





      <div>

        <label className="block font-bold mb-2">
          قيمة الخصم
        </label>


        <input
          name="discount_value"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
          className="w-full border rounded-xl px-4 py-3"
        />


      </div>





      <button
        type="submit"
        className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold"
      >

        إضافة العرض

      </button>


    </form>

  );
}
