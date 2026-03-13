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
                <h4>MSc Software Systems</h4>
                <h5>PSG College of Technology, Coimbatore</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Currently pursuing MSc Software Systems, focusing on artificial
              intelligence, machine learning, and full-stack web development.
              Building AI-powered multi-agent systems alongside my studies.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Freelance Full-Stack Developer</h4>
                <h5>Self-Employed</h5>
              </div>
              <h3>2024</h3>
            </div>
            <p>
              Built end-to-end web applications and AI-powered tools. Worked
              with React, FastAPI, Python, and cloud services including AWS and
              Supabase.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>AI &amp; Multi-Agent Systems Developer</h4>
                <h5>Independent Projects</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Building intelligent multi-agent systems using LangGraph and LLM
              orchestration. Shipping products like PlanB and NeoVerse that
              automate real-world workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
