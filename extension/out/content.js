"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACK_IDS = exports.TIER_NAMES = exports.TRACK_NAMES = void 0;
exports.lessonsFor = lessonsFor;
exports.findLesson = findLesson;
exports.allProblems = allProblems;
exports.findProblem = findProblem;
const content_json_1 = __importDefault(require("./content.json"));
const data = content_json_1.default;
exports.TRACK_NAMES = {
    cpp: "C++",
    arduino: "Arduino",
    python: "Python",
    react: "React",
};
exports.TIER_NAMES = {
    warmup: "Warm-up",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
};
exports.TRACK_IDS = ["cpp", "arduino", "python", "react"];
function lessonsFor(track) {
    return data.lessons[track] ?? [];
}
function findLesson(track, slug) {
    return lessonsFor(track).find((l) => l.slug === slug);
}
function allProblems() {
    return data.problems;
}
function findProblem(id) {
    return data.problems.find((p) => p.id === id);
}
//# sourceMappingURL=content.js.map