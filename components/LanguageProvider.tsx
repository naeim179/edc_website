"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

import {
  translations,
  type Language,
} from "@/lib/i18n";


type LanguageContextType = {
  language: Language;
  t: typeof translations.ar;
  changeLanguage: (language: Language) => void;
  mounted: boolean;
};


const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") {
    return "ar";
  }

  const saved =
    localStorage.getItem("app-language");

  return saved === "en"
    ? "en"
    : "ar";
};


const LanguageContext =
  createContext<LanguageContextType | null>(null);



export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [language, setLanguage] =
    useState<Language>(getInitialLanguage);


  const [mounted] =
    useState(true);



  function changeLanguage(
    nextLanguage: Language
  ) {

    setLanguage(nextLanguage);

    localStorage.setItem(
      "app-language",
      nextLanguage
    );


    document.documentElement.lang =
      nextLanguage;


    document.documentElement.dir =
      nextLanguage === "ar"
        ? "rtl"
        : "ltr";


    document.documentElement.dataset.lang =
      nextLanguage;
  }



  return (
    <LanguageContext.Provider
      value={{
        language,
        t: translations[language],
        changeLanguage,
        mounted,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}



export function useLanguage() {

  const context =
    useContext(LanguageContext);


  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }


  return context;
}
