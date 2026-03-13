import "./styles/Work.css";
import WorkImage from "./WorkImage";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const projects = [
  {
    name: "PlanB",
    category: "AI Agent System",
    tools: "LangGraph, WhatsApp API, Google Calendar, AWS SES",
    url: "https://github.com/Sanjey2005/PlanB",
  },
  {
    name: "NeoVerse",
    category: "Sales Intelligence Platform",
    tools: "FastAPI, Supabase, Gemini AI, AssemblyAI",
    url: "https://github.com/Sanjey2005/NeoVerse",
  },
  {
    name: "InsightPilot",
    category: "Data Analytics Tool",
    tools: "Python, Pandas, Matplotlib, Streamlit",
    url: "https://github.com/Sanjey2005/InsightPilot",
  },
  {
    name: "TwinVision",
    category: "AI / Machine Learning",
    tools: "Python, TensorFlow, OpenCV, Scikit-learn",
    url: "https://github.com/Sanjey2005/TwinVision",
  },
  {
    name: "Twitter Sentiment Analysis",
    category: "NLP / Data Science",
    tools: "Python, NLTK, Scikit-learn, Tweepy",
    url: "https://github.com/Sanjey2005/TwitterSentimentAnalysis",
  },
  {
    name: "EzyMoney",
    category: "Personal Finance Tracker",
    tools: "Java, JDBC, MySQL, Swing",
    url: "https://github.com/Sanjey2005/EzyMoney",
  },
];

const Work = () => {
  useGSAP(() => {
  let translateX: number = 0;

  function setTranslateX() {
    const box = document.getElementsByClassName("work-box");
    const rectLeft = document
      .querySelector(".work-container")!
      .getBoundingClientRect().left;
    const rect = box[0].getBoundingClientRect();
    const parentWidth = box[0].parentElement!.getBoundingClientRect().width;
    let padding: number =
      parseInt(window.getComputedStyle(box[0]).padding) / 2;
    translateX = rect.width * box.length - (rectLeft + parentWidth) + padding;
  }

  setTranslateX();

  let timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".work-section",
      start: "top top",
      end: `+=${translateX}`, // Use actual scroll width
      scrub: true,
      pin: true,
      id: "work",
    },
  });

  timeline.to(".work-flex", {
    x: -translateX,
    ease: "none",
  });

  // Clean up (optional, good practice)
  return () => {
    timeline.kill();
    ScrollTrigger.getById("work")?.kill();
  };
}, []);
  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>
        <div className="work-flex">
          {projects.map((project, index) => (
            <div className="work-box" key={index}>
              <div className="work-info">
                <div className="work-title">
                  <h3>0{index + 1}</h3>
                  <div>
                    <h4>
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        {project.name}
                      </a>
                    </h4>
                    <p>{project.category}</p>
                  </div>
                </div>
                <h4>Tools and features</h4>
                <p>{project.tools}</p>
              </div>
              <WorkImage image="/images/placeholder.webp" alt={project.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
