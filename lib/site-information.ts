import { informationNavigation, type InformationPageId, type LocalizedCopy as Copy } from "@/lib/site-information-navigation";
export { INFORMATION_ORDER, SUPPORT_EMAIL } from "@/lib/site-information-navigation";
export type { InformationPageId, InformationLanguage } from "@/lib/site-information-navigation";
type Section = { title: Copy; text: Copy };
type InformationPage = { title: Copy; intro: Copy; draft: boolean; sections: Section[] };

export const DRAFT_NOTICE: Copy = {
  ar: "مسودة للمراجعة — هذه الصفحة غير معتمدة بعد ولا تمثل سياسة نهائية. تُستكمل البيانات والشروط قبل اعتمادها.",
  en: "Draft for review — this page has not been approved and is not a final policy. Details and terms must be completed before approval.",
};
export const informationPages: Record<InformationPageId, InformationPage> = {
  about: {
    ...informationNavigation["about"],
    intro: { ar: "YOUR WAY ACADEMY مساحة للتعلّم تجمع الدورات والدروس والواجبات والتواصل مع المدرّس.", en: "YOUR WAY ACADEMY brings courses, lessons, assignments and instructor communication together in one learning space." },
    sections: [
      { title: { ar: "تعلّم يناسب دورتك", en: "Learning that fits your course" }, text: { ar: "تختلف طريقة التعلّم حسب الدورة: محتوى مسجّل، دروس مباشرة، أو مواعيد خاصة. راجع وصف الدورة وطريقة تقديمها قبل التسجيل.", en: "Courses may offer recorded content, live lessons or private appointments. Check the course description and delivery format before enrolling." } },
      { title: { ar: "متابعة من حسابك", en: "Follow your learning in your account" }, text: { ar: "بعد التسجيل، يمكنك متابعة الدورات التي لديك صلاحية الوصول إليها، والدروس والواجبات المتاحة فيها. المزايا والمواعيد تعتمد على الدورة التي تختارها.", en: "After signing in, you can follow the courses you have access to and their available lessons and assignments. Features and schedules depend on the course you choose." } },
    ],
  },
  contact: {
    ...informationNavigation["contact"],
    intro: { ar: "للاستفسار عن دورة أو مشكلة في حسابك أو طلب دفع، استخدم البريد أدناه.", en: "For questions about a course, your account or a payment request, use the email below." },
    sections: [
      { title: { ar: "ما الذي تذكره في رسالتك؟", en: "What to include" }, text: { ar: "اذكر اسم الدورة، واسم المستخدم، ووصف المشكلة. إذا كانت متعلقة بالدفع، أضف رقم مرجع العملية إن توفر. لا ترسل كلمة المرور أو رمز التحقق أو بيانات بطاقتك.", en: "Include the course name, your username and a description of the issue. For payment issues, include the transaction reference if available. Do not send passwords, verification codes or card details." } },
      { title: { ar: "بيانات التواصل", en: "Contact details" }, text: { ar: "هذا بريد التواصل المقترح للموقع، ولم يتم التحقق من استقباله للرسائل بعد. لم تُعتمد بعد بيانات الجهة القانونية والعنوان ورقم هاتف خدمة العملاء وساعات العمل.", en: "This is the proposed site contact email; receiving messages has not yet been verified. Legal business details, address, customer service phone number and opening hours have not yet been confirmed." } },
    ],
  },
  privacy: {
    ...informationNavigation["privacy"],
    intro: { ar: "توضح هذه المسودة أنواع البيانات المرتبطة باستخدام المنصة، وما يلزم استكماله لحماية حقوق المستخدمين.", en: "This draft describes the types of data involved in using the platform and the details still needed to address users’ rights." },
    sections: [
      { title: { ar: "البيانات واستخدامها", en: "Data and its uses" }, text: { ar: "تشمل بيانات الاستخدام معلومات الحساب والملف الشخصي، التسجيل بالدورات، التقدّم بالدروس، الواجبات والتسليمات، الرسائل والمرفقات، ومراجع الدفع وحالته. تُستخدم لتسجيل الدخول وتقديم الدورات ومتابعة التعلّم والتواصل وإدارة الوصول والمدفوعات.", en: "Usage data includes account and profile information, enrollments, lesson progress, assignments and submissions, messages and attachments, and payment references and status. It supports sign-in, course delivery, learning progress, communication, access management and payments." } },
      { title: { ar: "الخدمات المرتبطة", en: "Connected services" }, text: { ar: "تستخدم المنصة خدمات للاستضافة وإدارة الحسابات والبيانات وبث الفيديو ومعالجة الدفع، منها Cloudflare وSupabase وخدمات الفيديو المرتبطة بالدورة وPayTabs عند اختياره. قد تعالج هذه الخدمات البيانات اللازمة لوظيفتها. يجب استكمال تفاصيل مشاركة البيانات ومواقع المعالجة والضمانات المعتمدة.", en: "The platform uses hosting, account and data management, course video and payment services, including Cloudflare, Supabase, the video services used by each course, and PayTabs when selected. These services may process data needed for their functions. Data sharing, processing locations and applicable safeguards still need to be documented." } },
      { title: { ar: "إعدادات المتصفح", en: "Browser preferences" }, text: { ar: "تُستخدم ملفات تعريف الارتباط لحالة تسجيل الدخول وحفظ اللغة والمظهر، ويُستخدم التخزين المحلي أيضًا لحفظ اللغة والمظهر. يجب مراجعة أي خدمات قياس أو تتبع قبل اعتماد هذه السياسة.", en: "Cookies support sign-in sessions and language and appearance preferences. Local storage also saves language and appearance choices. Any analytics or tracking services must be reviewed before this policy is approved." } },
      { title: { ar: "طلبات الخصوصية", en: "Privacy requests" }, text: { ar: "يمكن إرسال استفسار عن بيانات الحساب عبر بريد التواصل، دون إرسال كلمات مرور. يلزم اعتماد هوية المسؤول عن البيانات، والأساس النظامي للمعالجة، ومدد الاحتفاظ والحذف، وإجراءات ممارسة الحقوق ومعالجة الشكاوى وفق البلد المعني.", en: "Questions about account data can be sent to the contact email without sharing passwords. The data controller, legal basis, retention and deletion periods, rights request process and complaints process must be confirmed for the applicable country." } },
    ],
  },
  terms: {
    ...informationNavigation["terms"],
    intro: { ar: "هذه مسودة لتنظيم استخدام المنصة وشراء خدماتها التعليمية؛ يلزم اعتمادها من الجهة المسؤولة قبل اعتبارها شروطًا تعاقدية.", en: "This draft covers platform use and educational purchases. The responsible business must approve it before it becomes contractual terms." },
    sections: [
      { title: { ar: "وصف الدورة والطلب", en: "Course description and order" }, text: { ar: "راجع وصف الدورة وطريقة تقديمها ومواعيدها والسعر ومدة الاشتراك والمبلغ الفعلي والعملة الظاهرة قبل الدفع. اختيار طريقة دفع أو فتح صفحتها لا يعني اكتمال الشراء؛ يُحدد الوصول وفق حالة الطلب والاشتراك.", en: "Review the course format, schedule, price, subscription duration, actual amount and currency before paying. Selecting a payment method or opening its page does not mean a purchase is complete; access depends on the order and subscription status." } },
      { title: { ar: "الحساب والوصول", en: "Account and access" }, text: { ar: "تتطلب الخدمات الخاصة بالطالب تسجيل الدخول وصلاحية الوصول للدورة. لا تشارك كلمة المرور، واستخدم وسائل التواصل داخل المنصة باحترام. يلزم اعتماد قواعد العمر المسموح، وحقوق المحتوى، وإيقاف الحساب وتسوية النزاعات.", en: "Student services require sign-in and course access. Keep passwords private and communicate respectfully. Age requirements, content rights, account suspension rules and dispute resolution must still be approved." } },
      { title: { ar: "التجديد", en: "Renewals" }, text: { ar: "إذا ظهر خيار التجديد التلقائي وتم اختياره، تُعرض موافقته بشكل مستقل في الدفع. يمكن تعطيله من أدوات الاشتراك المتاحة بالحساب. يلزم اعتماد شروط الإشعار والتجديد والاسترجاع قبل نشرها نهائيًا.", en: "Where automatic renewal is offered and selected, it has a separate consent in checkout. It can be disabled using the available account subscription controls. Renewal, notice and refund terms still need approval before final publication." } },
      { title: { ar: "بيانات لازمة للاعتماد", en: "Required before approval" }, text: { ar: "الاسم القانوني للجهة ورقم التسجيل إن انطبق والعنوان ووسائل التواصل، والقانون المعمول به، وشروط الإلغاء والاسترجاع وتعديل الخدمة، وتاريخ بدء سريان الشروط.", en: "Legal business name, registration details where applicable, address and contact details, governing law, cancellation and refund rules, service change rules, and effective date." } },
    ],
  },
  "refund-policy": {
    ...informationNavigation["refund-policy"],
    intro: { ar: "لم تُعتمد بعد شروط الاسترجاع. لا تتضمن هذه المسودة وعدًا بقبول طلب الاسترجاع أو رفضه ولا تحدد مدة مالية ملزمة.", en: "Refund terms have not yet been approved. This draft does not promise acceptance or rejection of a refund request or set a binding financial timeline." },
    sections: [
      { title: { ar: "إلغاء محاولة دفع", en: "Canceling a payment attempt" }, text: { ar: "الرجوع من صفحة الدفع أو إلغاء محاولة غير مكتملة ليس استرجاعًا لعملية مدفوعة. إذا ظهرت عملية قيد التحقق أو خصم غير متوقع، راجع حالة الطلب وتواصل برقم المرجع قبل إعادة المحاولة.", en: "Leaving checkout or canceling an incomplete attempt is different from refunding a paid transaction. If an attempt remains under review or an unexpected charge appears, check its status and contact support with the reference before retrying." } },
      { title: { ar: "طلب مراجعة عملية مدفوعة", en: "Requesting a paid transaction review" }, text: { ar: "أرسل اسم الدورة واسم المستخدم ورقم مرجع الدفع وسبب الطلب لبريد التواصل، دون بيانات بطاقة أو كلمة مرور. إرسال الطلب لا يعني الموافقة عليه. معالجة أي استرجاع تتطلب التحقق من العملية وتطبيق السياسة المعتمدة والحقوق النظامية ذات الصلة.", en: "Email the course name, username, payment reference and reason for the request without card details or passwords. Sending a request does not mean it is approved. Any refund requires transaction verification and the approved policy and applicable statutory rights." } },
      { title: { ar: "قرارات مطلوبة من صاحب النشاط", en: "Business decisions still required" }, text: { ar: "شروط أهلية الاسترجاع لكل نوع دورة، أثر بدء المحتوى أو حضور جلسة، مواعيد إلغاء أو تغيير الدروس الخاصة والقروب، التعامل مع إلغاء المدرّس أو تعذر الخدمة، وآلية الاسترجاع ومدته والرسوم إن وجدت.", en: "Eligibility for each course type; the effect of accessing content or attending a session; private and group session cancellation or rescheduling deadlines; instructor cancellations or service failures; and the refund method, timeline and any fees." } },
    ],
  },
  "delivery-policy": {
    ...informationNavigation["delivery-policy"],
    intro: { ar: "الخدمة تعليمية رقمية، ويختلف تقديمها بحسب نوع الدورة ووصفها. هذه مسودة تحتاج استكمال مدد التفعيل والتزامات تقديم الخدمة.", en: "This is a digital educational service, delivered according to each course’s type and description. Activation timelines and delivery commitments still need to be completed." },
    sections: [
      { title: { ar: "الدفع والوصول", en: "Payment and access" }, text: { ar: "تتطلب الدورات المدفوعة تأكيد الدفع وتفعيل الاشتراك. في PayTabs تُراجع نتيجة العملية، وفي CliQ تُراجع الحوالة وإثباتها قبل الموافقة. رفع إثبات حوالة لا يُعد موافقة على الدفع. تابع حالة الطلب والوصول من حسابك.", en: "Paid courses require payment confirmation and an active subscription. PayTabs transactions are checked for their result; CliQ transfers and proof are reviewed before approval. Uploading transfer proof does not mean payment is approved. Check your order and course access in your account." } },
      { title: { ar: "المسجّل والمباشر والخاص", en: "Recorded, live and private courses" }, text: { ar: "تُتاح الدروس المسجّلة المنشورة بحسب صلاحية اشتراكك. تعتمد الدروس المباشرة على جدول الدورة وروابط الجلسات. تعتمد الجلسات الخاصة على المواعيد التي حجزتها وتأكيدها. لا تفترض وجود تسجيل للجلسة أو وصول دائم ما لم يُذكر ذلك صراحة في وصف الدورة المعتمد.", en: "Published recorded lessons are available according to your subscription access. Live lessons use the course schedule and session links. Private sessions depend on your reserved and confirmed appointments. Do not assume session recordings or permanent access unless explicitly included in the approved course description." } },
      { title: { ar: "قبل اعتماد السياسة", en: "Before approval" }, text: { ar: "يلزم تحديد مدة مراجعة حوالات CliQ وتفعيل الوصول، ومتطلبات حضور الجلسات والمنطقة الزمنية، والتعامل مع الأعطال وتأجيل الجلسات، وما يحصل عند انتهاء الاشتراك. لا تتضمن هذه المسودة تعهدًا بمدة تفعيل محددة.", en: "Confirm CliQ review and access activation timelines, session requirements and time zone, outage and rescheduling arrangements, and what happens when a subscription ends. This draft does not promise a specific activation time." } },
    ],
  },
};
