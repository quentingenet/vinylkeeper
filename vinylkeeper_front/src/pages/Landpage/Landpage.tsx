import { useState } from "react";

import useDetectMobile from "../../hooks/useDetectMobile";
import Login from "@components/Login/Login";
import Register from "@components/Register/Register";
import Footer from "@components/Footer/Footer";

export default function Landpage() {
  const isMobile = useDetectMobile();

  const [login, setLogin] = useState<boolean>(false);
  const [register, setRegister] = useState<boolean>(false);

  return (
    <>
      {isMobile ? (
        <video autoPlay muted loop id="videoBackgroundVinylKeeper">
          <source
            src={"https://vinyl-keeper.quentingenet.fr/landpageBackground.mp4"}
            type="video/mp4"
          />
        </video>
      ) : (
        <div id="imgMobileBackgroundVinylKeeper"></div>
      )}
      <div className="global-container">
        <h1>Vinyl Keeper</h1>
        <p>
          Free and open-source
          <br /> Vinyl Keeper is your go-to solution
          <br /> for effortlessly managing your vinyl collection with fun !
        </p>
        {!login && !register && (
          <div className="button-container">
            <button
              onClick={() => {
                setLogin(true);
              }}
            >
              Login
            </button>
            <button
              onClick={() => {
                setRegister(true);
              }}
            >
              Register
            </button>
          </div>
        )}
      </div>
      {login && (
        <div className="action-container">
          <Login />
        </div>
      )}
      {register && (
        <div className="action-container">
          <Register />
        </div>
      )}
      <Footer />
    </>
  );
}
