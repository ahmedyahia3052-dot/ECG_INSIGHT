# PTB-XL Dataset Loader Fix Report

## Summary

Fixed the Google Colab PTB-XL loader in `train_ecg_colab.ipynb` so WFDB records are read from the exact PhysioNet v1.0.3 waveform folders instead of relying on an ambiguous full relative path.

## Root Cause

The notebook passed `filename_lr` directly as the WFDB record path with `pn_dir='ptb-xl/1.0.3'`. PTB-XL metadata stores waveform stems such as `records100/06000/06893_lr`, while WFDB remote loading is more reliable when the record stem and the shard directory are separated:

- `record_name`: `06893_lr`
- `pn_dir`: `ptb-xl/1.0.3/records100/06000`

Using this layout avoids malformed PhysioNet URLs and prevents `NetFileNotFoundError: 404 Error`.

## Verified PhysioNet PTB-XL Structure

PTB-XL v1.0.3 is published at:

`https://physionet.org/files/ptb-xl/1.0.3/`

Relevant files and folders:

- `ptbxl_database.csv`
- `scp_statements.csv`
- `records100/<shard>/<record>_lr.hea`
- `records100/<shard>/<record>_lr.dat`
- `records500/<shard>/<record>_hr.hea`
- `records500/<shard>/<record>_hr.dat`

Metadata path columns:

- `filename_lr` points to 100 Hz waveform stems under `records100`.
- `filename_hr` points to 500 Hz waveform stems under `records500`.

## Notebook Changes

- Added explicit PTB-XL constants for PhysioNet project path, sample rate, record column, and record root.
- Added path normalization for metadata values, including extension stripping for `.hea` and `.dat`.
- Added validation that `filename_lr` is used only with `records100` and `filename_hr` is used only with `records500`.
- Split WFDB remote loading into `record_name` plus shard-specific `pn_dir`.
- Added a pre-training validation step that reads five ECG records before the training subset is downloaded.
- Wrote validation output to `ptbxl_wfdb_validation.json` in the run data directory.
- Expanded the training manifest to include `record_path`, `record_name`, and `pn_dir`.

## Validation Evidence

Notebook integrity checks:

- `train_ecg_colab.ipynb` parses as valid JSON.
- Python code cells 1 through 11 compile successfully after skipping the expected Colab `!pip` magic line.

Local WFDB smoke test used the same logic now present in the notebook and successfully read five PTB-XL records:

```json
[
  {
    "ecg_id": 6893,
    "relative_path": "records100/06000/06893_lr",
    "pn_dir": "ptb-xl/1.0.3/records100/06000",
    "record_name": "06893_lr",
    "shape": [1000, 12],
    "fs": 100.0
  },
  {
    "ecg_id": 1433,
    "relative_path": "records100/01000/01433_lr",
    "pn_dir": "ptb-xl/1.0.3/records100/01000",
    "record_name": "01433_lr",
    "shape": [1000, 12],
    "fs": 100.0
  },
  {
    "ecg_id": 16655,
    "relative_path": "records100/16000/16655_lr",
    "pn_dir": "ptb-xl/1.0.3/records100/16000",
    "record_name": "16655_lr",
    "shape": [1000, 12],
    "fs": 100.0
  },
  {
    "ecg_id": 6883,
    "relative_path": "records100/06000/06883_lr",
    "pn_dir": "ptb-xl/1.0.3/records100/06000",
    "record_name": "06883_lr",
    "shape": [1000, 12],
    "fs": 100.0
  },
  {
    "ecg_id": 7035,
    "relative_path": "records100/07000/07035_lr",
    "pn_dir": "ptb-xl/1.0.3/records100/07000",
    "record_name": "07035_lr",
    "shape": [1000, 12],
    "fs": 100.0
  }
]
```

## Remaining Runtime Note

The full training workflow is designed for Google Colab because it mounts Google Drive and uses Colab-managed runtime dependencies. The local Windows Python runtime is missing the Colab training stack (`torch`, `scikit-learn`, ONNX, TensorBoard, and `tqdm`), so local full training execution was not representative. The PTB-XL remote loader path was validated locally against live PhysioNet records; full GPU training should be run in Colab with the updated notebook.
