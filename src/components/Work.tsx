import "./styles/Work.css";
import WorkImage from "./WorkImage";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// url = live site when one exists, else the GitHub repo. image: real screenshot or a labelled illustration.
const projects = [
  {
    name: "Placement Chronicles",
    category: "Placement Experience Platform",
    description:
      "PSG Tech placement platform used by 400+ students, with 100+ interview experiences. Gemini 1.5 Flash structures uploaded PDFs and a RAG chatbot searches them.",
    tools: "Next.js, TypeScript, MongoDB, Gemini",
    url: "https://placement-chronicles.vercel.app",
    image: "/images/projects/placement-chronicles.webp",
  },
  {
    name: "QuizCraftAI",
    category: "AI Quiz Platform",
    description:
      "Generates quizzes from a prompt or PDF/DOCX with Llama 3.1 70B, asynchronously. Classrooms, timed attempts and leaderboards. TeachEdison Hackathon 2026.",
    tools: "Next.js, Django REST, PostgreSQL, Celery, Redis",
    // live site (quiz-craft-ai-five.vercel.app) returns 404 DEPLOYMENT_NOT_FOUND, so link the repo
    url: "https://github.com/Sanjey2005/QuizCraftAI",
    image: "/images/projects/quizcraftai.webp",
  },
  {
    name: "PlanB",
    category: "WhatsApp Scheduling Assistant",
    description:
      "14 LangGraph agents detect disruptions, map the cascade across calendar events and reschedule via Google Calendar. Built for Neoverse '26.",
    tools: "Python, FastAPI, LangGraph",
    url: "https://github.com/Sanjey2005/PlanB",
    image: "/images/projects/planb.webp",
  },
  {
    name: "FaceTracker",
    category: "Real-time Face Recognition",
    description:
      "Detects, recognises and counts visitors across up to 4 RTSP streams with YOLOv11, ByteTrack, InsightFace and FAISS. Live WebSocket events and 18 REST endpoints. Katomaran Hackathon.",
    tools: "Python, FastAPI, React, PostgreSQL",
    url: "https://github.com/Sanjey2005/FaceTracker",
    image: "/images/projects/facetracker.webp",
  },
  {
    name: "Distributed SandPy",
    category: "Distributed Code Execution",
    description:
      "Spreads Python jobs across a pool of Jupyter workers: a Redis Lua script picks the least-busy one and a Redis lock elects the leader. Co-built with Shyam-GK.",
    tools: "Python, FastAPI, Redis, Docker, Next.js",
    url: "https://github.com/Sanjey2005/Distributed_SandPy",
    image: "/images/projects/distributed-sandpy.webp",
  },
  {
    name: "SentiMood",
    category: "Sentiment Analysis",
    description:
      "Compares Logistic Regression, Random Forest, LSTM and BERT on Sentiment140 (1.6M tweets), with bias/fairness and adversarial-robustness analysis.",
    tools: "Python, Scikit-learn, PyTorch, Transformers",
    url: "https://github.com/Sanjey2005/TwitterSentimentAnalysis",
    image: "/images/projects/sentimood.webp",
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
                <p>{project.description}</p>
                <h4>Tools and features</h4>
                <p>{project.tools}</p>
              </div>
              <WorkImage image={project.image} alt={project.name} link={project.url} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
