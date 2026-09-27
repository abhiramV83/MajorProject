"""
Model Training Script
-----------------------
Trains Random Forest, Gradient Boosting, and MLP on synthetic demo data.

Usage:
    python scripts/train_models.py

IMPORTANT: All metrics are from SYNTHETIC data. They do not represent
real-world performance. The paper's results (85.7% accuracy, 86.9% recall,
0.928 AUC) are from their study dataset and are NOT reproduced here.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

os.chdir(os.path.join(os.path.dirname(__file__), ".."))

from backend.app.ml.pipeline import train_all_models

if __name__ == "__main__":
    print("=" * 60)
    print("DRUG COURT DSS - MODEL TRAINING")
    print("=" * 60)
    print("DISCLAIMER: Training on SYNTHETIC demonstration data.")
    print("Results do NOT represent real-world performance.")
    print("=" * 60)

    results = train_all_models()

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE - SYNTHETIC DEMONSTRATION RESULTS")
    print("=" * 60)
    for model_name, metrics in results.items():
        print(f"\n{model_name.upper()}:")
        print(f"  Accuracy:  {metrics['accuracy']:.3f}")
        print(f"  Precision: {metrics['precision']:.3f}")
        print(f"  Recall:    {metrics['recall']:.3f}")
        print(f"  F1:        {metrics['f1']:.3f}")
        print(f"  ROC-AUC:   {metrics['roc_auc']:.3f}")
    print("\nModels saved to models/ directory.")
