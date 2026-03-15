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
                <h4>MSc Software Systems (5 Year Integrated)</h4>
                <h5>PSG College of Technology, Coimbatore</h5>
              </div>
              <h3>2023 — NOW</h3>
            </div>
            <p>
              Pursuing a 5-year integrated MSc in Software Systems, with a focus
              on artificial intelligence, machine learning, and full-stack
              development. Started in 2023 and currently in the program.
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
