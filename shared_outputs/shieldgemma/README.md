# ShieldGemma 기준 판정 결과 (DNA·Jigsaw)

기준 판정 모델 `google/shieldgemma-2b`로 DNA·Jigsaw 텍스트를 판정한 결과입니다. 해탁님 요청 형식(`judgments_shieldgemma_{source}.csv`)에 맞췄고, 세 모델 결과를 공통 `judgments.csv`로 통합할 때 사용합니다. ProsocialDialog는 유사도 점수표와 텍스트 파일이 준비되면 같은 코드로 이어서 판정합니다.

## 파일

| 파일 | 행 수 | 내용 |
| --- | ---: | --- |
| `judgments_shieldgemma_dna.csv` | 33,804 | DNA 판정 (default 28,170 + rule_sentence_only 5,634) |
| `judgments_shieldgemma_jigsaw.csv` | 6,087 | Jigsaw 판정 (default 4,058 + rule_sentence_only 2,029) |
| `shieldgemma_run_config.json` | - | 실행 설정, 토큰 id, 근거, 입력 커밋 기록 |
| `shieldgemma_judge.py` | - | Kaggle 노트북에서 실행한 코드 전체 |

컬럼: `text_id, source, split, model_name, condition, rule_id, violation_prob, model_output, human_label`

- `text_id`, `rule_id`: 공유 입력의 기존 ID 그대로
- `split`: `splits.csv` 기준 (Jigsaw 텍스트 파일과 다른 659건도 `splits.csv`를 따름)
- `model_name`: `shieldgemma_2b`
- `model_output`: 위반 확률 0.5 이상이면 `Yes`. 최종 임계값이 아니며, 임계값은 dev에서 F1이 가장 높은 값으로 따로 정합니다.

## 조건별 규칙 선택

| condition | DNA | Jigsaw |
| --- | --- | --- |
| `default` | `dna_similarity.csv`에서 **소분류(minor) 규칙 중 유사도 상위 5개** | 하위 규칙 2개 모두 (상위 노드 `jigsaw_major_community_rules`는 규칙 문장이 아닌 제목이라 제외) |
| `rule_sentence_only` | 정답 규칙 `gold_rule_id` | 정답 규칙 `gold_rule_id` |

- 같은 (텍스트, 규칙) 질문은 한 번만 계산해 두 조건에 함께 썼습니다. 실제 계산 34,460번.
- default의 최종 확률(BFS에서 τ를 넘은 규칙 중 최댓값, 없으면 상위 1개)은 BFS 결과가 나온 뒤 계산합니다. **BFS 후보 기준이 "소분류 유사도 상위 5개"와 다르면 이 파일에 없는 규칙이 생길 수 있으니 맞춰 주세요.**
- `rule_excluded`, `rule_sentence_examples` 조건은 아직 하지 않았습니다 (숨길 규칙 목록, DNA 예시 선택 방법 결정 후 진행).

## 실행 설정 (조교 안내 기준, 팀 판정기와 같아야 함)

| 항목 | 값 |
| --- | --- |
| 모델 | `google/shieldgemma-2b` (Hugging Face 원본, 가중치 변경 없음) |
| 정밀도 | float16 |
| attention | `attn_implementation="eager"` |
| 배치 | 8, 왼쪽 패딩 |
| 최대 입력 | 2,048토큰 (넘으면 맥락 앞부분부터 자르고 판정할 텍스트는 자르지 않음, 이번 실행에서 잘린 입력 0개) |
| 템플릿 | `tokenizer.apply_chat_template(chat, guideline=...)` (모델 저장소의 공식 템플릿) |
| 정책 형식 | `"<규칙 이름>": <규칙 문장>` (규칙 문장을 첫 `:`에서 이름/설명으로 나눔, `:`가 없는 DNA 소분류 8개는 문장 전체를 둘 다로 사용) |
| DNA | 응답 판정 템플릿 (사용자 = 질문 `context`, 모델 = 응답 `raw_text`) |
| Jigsaw | 입력 판정 템플릿 (사용자 = 댓글 `raw_text`) |
| 위반 확률 | 마지막 위치의 `softmax([logit_Yes, logit_No])[0]` |
| 토큰 id | Yes = 3553, No = 1294 (각각 토큰 하나인지 확인) |
| 환경 | Kaggle T4, transformers 5.20.2 |

## float16을 쓴 근거

dev 20개(DNA·Jigsaw 위반/정상 각 5개, 정답 규칙 조건)로 미리 비교했습니다.

| 확인 | 결과 |
| --- | --- |
| float32 vs float16 최대 차이 | 0.0044 |
| float16 NaN | 없음 |
| 왼쪽 패딩: 한 개씩 vs 8개씩 (float32) | 0.000002 |
| 예상 시간 | float32 3.2시간 / float16 0.8시간 |

## 결과 점검

- 확률 빠진 행 0, 0~1 밖 확률 0, 중복 (text_id, condition, rule_id) 0, `splits.csv`와 다른 split 0
- dev, `rule_sentence_only` 조건 확인:

| 출처 | dev 개수 (위반) | ROC-AUC | 평균 확률 위반 / 정상 |
| --- | --- | ---: | --- |
| DNA | 4,464 (154) | 0.680 | 0.270 / 0.066 |
| Jigsaw | 1,619 (821) | 0.714 | 0.371 / 0.223 |

DNA는 위반이 3.4%로 드물어 PR-AUC를 함께 봐야 합니다. test는 최종 평가 단계까지 보지 않았습니다.

## 입력 (커밋 고정)

- 텍스트·규칙·분할: `shared_inputs/rule_similarity/` @ `4b23b3b961b1aee9cf784ffe087fb24075a72029`
- DNA 유사도: PR #1 `public/dna_similarity.csv` @ `8e2cc5d66aeb316f791301e938c2c92d07a0066d`
- Jigsaw 규칙은 공유 폴더 스냅샷 문장을 썼습니다. DB 대조 결과 문장이 달라지면 Jigsaw만 다시 판정합니다 (약 10분).
- 유사도 점수표가 바뀌면 default 후보가 달라지므로 DNA default를 다시 판정해야 합니다.

## 참고

DNA 규칙 문장 일부는 `"Graphic Violence": Questions expressing ...`처럼 질문 기준으로 쓰여 있는데, 판정 대상은 응답입니다. 규칙 문장 수정(P4, 팀 판정기 프롬프트 ③) 후보로 볼 수 있습니다.
