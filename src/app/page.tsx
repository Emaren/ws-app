import Image from "next/image";

export default function Home() {
  console.log("🍞 Rendering Home page");
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      {/* <Image
        src="/logo.png"
        alt="Wheat And Stone Logo"
        width={960}   
        height={320} 
        priority
      /> */}
    </div>
  );
}
