"use client";

import { updateCourseOffer } from "@/app/actions/course-offers";


export default function EditOfferForm({
  offerId,
  courseId,
  price,
  discountType,
  discountValue,
}: {
  offerId:string;
  courseId:string;
  price:number;
  discountType:string|null;
  discountValue:number|null;
}) {


  const action =
    updateCourseOffer.bind(
      null,
      offerId,
      courseId
    );


  return (

    <form
      action={action}
      className="space-y-3 border rounded-xl p-4 bg-slate-50"
    >

      <h4 className="font-bold">
        تعديل العرض
      </h4>


      <input
        name="price"
        type="number"
        min="0"
        step="0.01"
        defaultValue={price}
        className="w-full border rounded-xl px-4 py-2"
      />


      <select
        name="discount_type"
        defaultValue={discountType ?? ""}
        className="w-full border rounded-xl px-4 py-2"
      >

        <option value="">
          بدون خصم
        </option>

        <option value="percentage">
          نسبة %
        </option>

        <option value="fixed">
          مبلغ ثابت
        </option>

      </select>


      <input
        name="discount_value"
        type="number"
        min="0"
        step="0.01"
        defaultValue={discountValue ?? 0}
        className="w-full border rounded-xl px-4 py-2"
      />


      <button
        type="submit"
        className="bg-[#124b8a] text-white px-5 py-2 rounded-xl font-bold"
      >
        حفظ التعديل
      </button>


    </form>

  );
}
