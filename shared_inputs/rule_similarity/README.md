# 규칙 유사도 계산용 공유 입력

DNA·Jigsaw의 텍스트와 규칙에 `sentence-transformers/all-roberta-large-v1`을 적용하여 규칙 유사도를 생성하기 위한 입력 스냅샷입니다. CSV를 직접 읽어 사용할 수 있으며 Supabase 접근이나 Llama Guard 판정 결과가 필요하지 않습니다.

## 파일

| 파일 | 행 수 | 용도 |
| --- | ---: | --- |
| `dna_texts.csv` | 5,634 | DNA 텍스트, 맥락, 기존 ID, 분할 |
| `dna_rules.csv` | 78 | DNA 규칙 문장과 계층 |
| `jigsaw_texts.csv` | 2,029 | Jigsaw 텍스트, 기존 ID, 분할 |
| `jigsaw_rules.csv` | 3 | 로컬 규칙 스냅샷: 상위 노드 1개와 하위 규칙 2개. 아래 주의사항 확인 필요 |
| `splits.csv` | 53,108 | DNA·Jigsaw·ProsocialDialog 전체의 공통 분할. 이번 계산에서는 DNA·Jigsaw만 사용 |

## ID와 분할

- 텍스트 파일의 `id`를 결과의 `text_id`로 그대로 사용합니다.
- 규칙 파일의 `id`를 결과의 `rule_id`로 그대로 사용합니다.
- `splits.csv`의 `text_id`로 연결하고 기존 `dev`/`test`를 유지합니다. 새 ID나 무작위 분할을 만들지 않습니다.
- 로컬 원본 Jigsaw 텍스트의 `split` 659건이 공통 `splits.csv`와 달랐습니다. 이 폴더의 공유본만 공통 분할에 맞췄으며 원본 `data/processed/` 파일은 변경하지 않았습니다.
- 분할은 로컬 공통 파일 기준이며, 이번 공유 과정에서 실시간 DB를 다시 조회하지는 않았습니다. 추후 DB와 차이가 발견되면 공통 입력 버전을 함께 갱신하세요.
- 프롬프트·임계값 선택과 수정 분석은 dev에서 수행하고 test 성능 평가는 최종 평가 단계까지 보류합니다.

## 계산 및 출력

1. 우선 DNA부터 진행합니다. DNA 텍스트는 DNA 규칙과, Jigsaw 텍스트는 Jigsaw 규칙과 비교합니다.
2. 텍스트 입력은 `context`가 있으면 `Context: {context}\nText: {raw_text}`, 없으면 `raw_text`를 사용합니다. 규칙 입력은 `rule_text`입니다. 입력 구성과 모델 설정을 결과와 함께 기록합니다.
3. `sentence-transformers/all-roberta-large-v1`으로 양쪽 임베딩을 생성하고 코사인 유사도를 계산합니다. 정규화 임베딩의 내적으로 계산할 수 있습니다.
4. DNA는 5,634개 텍스트와 78개 규칙을 모두 비교하면 439,452행입니다. BFS 경로 분석을 위해 규칙의 `level`을 유지합니다.
5. 결과 파일은 다음 컬럼을 사용합니다.

```text
text_id,rule_id,level,similarity
```

- `(text_id, rule_id)` 조합이 중복되지 않아야 하며, 두 ID는 공유 입력에 존재해야 합니다.
- `similarity`에는 코사인 유사도를 저장합니다. 위반 확률과 다르며 음수도 가능합니다.
- 기존 생성 코드가 `score`라는 출력명을 쓰면 통합 전에 `similarity`로 맞춥니다.
- `dna_similarity.csv`와 `jigsaw_similarity.csv`로 각각 전달하면 이후 통합할 수 있습니다.
- 유사도 계산에는 `human_label`, `gold_rule_id`를 입력하지 않습니다. 이 컬럼들은 이후 평가·분석용입니다.

## Jigsaw 확인 사항

공유 규칙 파일은 아직 최신 DB와 대조하지 않은 로컬 스냅샷입니다. 팀 공유 내용상 DB에는 Jigsaw 규칙 2개가 있지만, 이 파일에는 상위 노드 `jigsaw_major_community_rules`까지 포함해 3개가 있습니다.

- 하위 규칙 ID는 `jigsaw_minor_560931914f54`, `jigsaw_minor_677797f76c2c`입니다.
- 최신 DB의 규칙 ID·문장과 두 하위 규칙을 대조하고, 상위 노드를 탐색 구조에 어떻게 사용할지 맞춘 뒤 Jigsaw 계산을 확정하세요.
- 두 하위 규칙만 비교하면 2,029 × 2 = 4,058행입니다. 상위 노드의 유사도 포함 여부는 규칙 트리 구현 기준에 따라 정합니다.
- 기존 로컬 `jigsaw_similarity.csv`도 있으므로 담당자에게 생성 모델·입력을 확인해 재사용 여부를 결정할 수 있습니다. 이번 폴더에는 검증하지 않은 결과를 포함하지 않았습니다.

## 범위

이번 공유는 규칙 유사도 계산용 입력 전달입니다. 모델 판정 결과(`judgments`)나 좌표(`coords`)의 완성을 뜻하지 않으며, ProsocialDialog는 이번 규칙 유사도 계산 대상에 포함하지 않습니다. 이 폴더를 GitHub에 올리는 것으로 Supabase 적재가 수행되지는 않습니다.
