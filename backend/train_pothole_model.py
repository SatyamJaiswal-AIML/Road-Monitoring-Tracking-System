"""
UrbanEye AI — YOLOv8 Road Defect & Pothole Model Training & Fine-Tuning Pipeline
Smart India Hackathon 2026 (Problem Statement 26124 - Bharat Electronics Limited)

This script trains or fine-tunes a YOLOv8 model on road defect datasets
(e.g., IEEE RDD2022 India subset or Roboflow Road Damage Benchmark).
"""

import os
import sys
from ultralytics import YOLO

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_model(
    base_model="yolov8n.pt",
    data_yaml=None,
    epochs=15,
    imgsz=640,
    batch_size=8,
    output_name="pothole_retrained.pt"
):
    print("=" * 70)
    print(" [URBANEYE AI] ROAD DEFECT & POTHOLE MODEL RE-TRAINING PIPELINE")
    print(f" Base Model     : {base_model}")
    print(f" Target Classes : POTHOLES, BROKEN_SIGNAGE, FADED_CROSSING, DEBRIS")
    print(f" Training Epochs: {epochs} | Image Size: {imgsz}x{imgsz}")
    print("=" * 70)

    # 1. Load pretrained model
    model = YOLO(base_model)

    # 2. If no custom dataset YAML provided, demonstrate fine-tuning transfer learning
    if not data_yaml or not os.path.exists(data_yaml):
        print("\n[INFO] No custom dataset YAML path specified.")
        print("[INFO] Active production weights currently deployed:")
        print(f"       -> backend/models/pothole_y8best.pt (130 MB HuggingFace Municipal Model)")
        print("       -> Classes: POTHOLES, BROKEN_SIGNAGE, FADED_SIGNAGE, CONSTRUCTION_ROAD, etc.")
        print("\nTo fine-tune on custom local dataset, run:")
        print("python train_pothole_model.py --data path/to/dataset.yaml --epochs 25")
        return

    # 3. Execute PyTorch / Ultralytics Training
    print(f"\n[TRAINING] Starting transfer learning on {data_yaml}...")
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        name="urbaneye_road_defect",
        save=True
    )

    # 4. Save best weights
    best_weights = os.path.join(results.save_dir, "weights", "best.pt")
    target_path = os.path.join(MODELS_DIR, output_name)
    if os.path.exists(best_weights):
        import shutil
        shutil.copy(best_weights, target_path)
        print(f"\n[SUCCESS] Retrained model saved to: {target_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train UrbanEye Pothole Model")
    parser.add_argument("--data", default=None, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=15, help="Number of epochs")
    parser.add_argument("--base", default="backend/models/pothole_y8best.pt", help="Base model weights")
    args = parser.parse_args()

    train_model(base_model=args.base, data_yaml=args.data, epochs=args.epochs)
