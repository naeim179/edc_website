"use client";

import { createOrder } from "@/app/actions/orders";
import { useTransition } from "react";


export default function BuyCourseButton({
  courseId,
}:{
  courseId:string;
}){

  const [pending,startTransition]=useTransition();


  return (
    <button
      disabled={pending}
      onClick={()=>{
        startTransition(()=>{
          createOrder(courseId);
        });
      }}
      className="bg-[#087a54] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
    >
      {pending ? "جاري المعالجة..." : "شراء الآن"}
    </button>
  );
}
