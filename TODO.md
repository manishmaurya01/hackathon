# VeriWrite AI - Implementation Plan

## Current State Analysis
The project has a solid foundation with:
- Backend: Express, MongoDB, Mongoose, JWT auth, file upload, text extraction, OpenRouter AI analysis
- Frontend: React, Vite, Tailwind, React Router with all pages implemented
- AI Writing Analysis: Working with OpenRouter, structured prompts, validation

## Missing Features to Implement

### 1. Plagiarism Detection Engine (PRIORITY 1)
- [ ] Create search provider abstraction (`backend/src/services/search/`)
- [ ] Implement Tavily/Serper search provider
- [ ] Add sentence segmentation and important phrase selection
- [ ] Implement text similarity (n-grams, Jaccard, token overlap)
- [ ] Add semantic similarity via embeddings (OpenRouter)
- [ ] Create plagiarism analysis pipeline
- [ ] Extend Report model with plagiarism fields
- [ ] Update analysis controller to run plagiarism check

### 2. Writing Style Analysis (PRIORITY 2)
- [ ] Add deterministic text statistics service
- [ ] Calculate: word count, sentence count, paragraph count, avg sentence length, vocabulary diversity, repeated phrases, longest/shortest sentence
- [ ] Add to analysis pipeline and report

### 3. Enhanced Report Model & UI (PRIORITY 3)
- [ ] Update Report schema with plagiarismAnalysis, styleAnalysis
- [ ] Update ReportDetail page to show both AI and Plagiarism sections
- [ ] Add Overall Status calculation from combined signals
- [ ] Add Evidence Explorer for plagiarism sources

### 4. Dashboard & Stats (PRIORITY 4)
- [ ] Enhance dashboard stats with plagiarism metrics
- [ ] Add "High Similarity" filter to Reports page

### 5. Configuration & Environment (PRIORITY 5)
- [ ] Add SEARCH_PROVIDER, TAVILY_API_KEY/SERPER_API_KEY to env
- [ ] Update .env.example files

### 6. Testing & Polish (PRIORITY 6)
- [ ] Test complete flow with various inputs
- [ ] Fix any runtime errors
- [ ] Ensure error handling works for all failure modes