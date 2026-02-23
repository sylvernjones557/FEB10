class RecognitionPipeline:
    """
    Phase 6.2 → Phase 9.3 – Recognition Pipeline

    Responsibility:
    Frame → faces → embeddings → identity decisions

    ❌ No attendance logic
    ❌ No session logic
    """

    # Confidence below this is flagged but still returned
    CONFIDENCE_THRESHOLD = 0.60

    def __init__(self, detector, cropper, embedder, identity_manager):
        self.detector = detector
        self.cropper = cropper
        self.embedder = embedder
        self.identity_manager = identity_manager

    def process_frame(self, frame):
        """
        Process a full video frame.

        Returns:
        List of:
        {
            'person_id': str | None,
            'similarity': float | None,
            'is_new': bool,
            'low_confidence': bool
        }
        """

        results = []

        # 1️⃣ Detect faces
        bboxes = self.detector.detect(frame)
        if not bboxes:
            return results

        # 2️⃣ Process each detected face
        for bbox in bboxes:
            face = self.cropper.crop(frame, bbox)
            if face is None:
                continue

            embedding = self.embedder.embed(face)
            if embedding is None:
                continue

            # 3️⃣ Identity decision (PURE LOGIC)
            identity_result = self.identity_manager.recognize(embedding)

            # Normalize output safely
            person_id = identity_result.get("person_id")
            similarity = identity_result.get("similarity")
            is_new = identity_result.get("is_new", False)

            low_confidence = (
                similarity is not None
                and similarity < self.CONFIDENCE_THRESHOLD
            )

            results.append({
                "person_id": person_id,
                "similarity": similarity,
                "is_new": is_new,
                "low_confidence": low_confidence
            })

        return results

