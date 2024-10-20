import { Link } from "@remix-run/react";
import { Button } from "./ui/button";

export function NotFound() {
  return (
    <div className=" relative flex flex-col  min-h-screen bg-gray-100">
      <img
        src="https://cdn.midjourney.com/2d52b3b7-58cb-4b18-905b-9c3a877308f8/0_2.png"
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        alt=""
      />
      <div className="z-10 mt-24 flex flex-col items-center justify-center pt-10 p-8 bg-white/20 backdrop-blur-sm w-fit mx-auto rounded-lg">
        <h1 className="text-3xl font-light text-gray-900 mb-3">404</h1>
        <p className="text-xl text-gray-600 mb-3 font-light">
          You are lost in space.
        </p>
        <Button asChild>
          <Link to="/">Go to Homepage</Link>
        </Button>
      </div>
    </div>
  );
}
