import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>AI & Video Analytics Intern</h4>
                <h5>Katomaran Technologies, Coimbatore</h5>
              </div>
              <h3>MAY 2026 — NOW</h3>
            </div>
            <p>
              Independently built 5 real-time video analytics for the Odisha
              Prison Project: intrusion, wall climbing, crowd detection,
              perimeter crossing and object-thrown detection. Contributed to
              redesigning a distributed video processing pipeline with
              motion-triggered recording and YOLO inference workers for person
              and vehicle detection, and assisted with model training and
              dataset preparation for GD Naidu ITMS. Evaluated video-language
              models with vLLM, built AI-powered incident search, and
              contributed to an Orange Pi edge gateway for camera streaming,
              device management and cloud onboarding.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>M.Sc (Integrated) Software Systems</h4>
                <h5>PSG College of Technology, Coimbatore</h5>
              </div>
              <h3>2023 — NOW</h3>
            </div>
            <p>
              Pursuing an integrated M.Sc in Software Systems, graduating in
              2028. Started in 2023 and currently in the program.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Personal Projects & Development</h4>
                <h5>Independent Work</h5>
              </div>
              <h3>2023 — NOW</h3>
            </div>
            <p>
              Building AI-powered systems and full-stack applications alongside
              my studies — from multi-agent schedulers and sales intelligence
              platforms to data analytics tools and finance trackers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
