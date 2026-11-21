# P1 BFS 최종 후보 (τ=0.02)

P1 BFS(대→중→소 계층 탐색, τ 통과 노드만 하위로 내려감)로 뽑은 텍스트별 최종 후보 규칙 목록입니다. ShieldGemma 등 P2 판정의 `default` 조건 입력으로 쓸 수 있습니다.

## 파일

| 파일 | 행 수 | 내용 |
| --- | ---: | --- |
| `p2_candidates_dna.csv` | 300,433 | DNA 5,634개 텍스트의 BFS 최종 후보 (텍스트당 평균 53.3개) |
| `p2_candidates_jigsaw.csv` | 3,751 | Jigsaw 2,029개 텍스트의 BFS 최종 후보 (텍스트당 평균 1.85개) |

컬럼: `text_id, rule_id, score, tau`

- `score`: 해당 (텍스트, 규칙) 쌍의 RoBERTa 코사인 유사도 (`similarity_steps` 원본값)
- `tau`: 0.02로 고정 (dev에서 DNA top-1 정확도 최댓값 기준 선택, Jigsaw는 규칙이 2개뿐이라 τ에 따라 정확도가 전혀 안 바뀌어서 DNA와 동일값 사용)

## τ=0.02 선택 근거 (dev 기준)

| source | τ | top-1 | top-3 | 효율(방문비율) |
| --- | --- | ---: | ---: | ---: |
| DNA | 0.00 | 28.07% | 49.31% | 96.8% |
| DNA | **0.02** | **28.11%** | **49.51%** | 93.4% |
| DNA | 0.04 | 27.78% | 49.19% | 88.5% |
| Jigsaw | 전 구간 | 96.60% (고정) | ~99.5~100% | 100% (고정) |

전체 31개 τ(0.00~0.60, 0.02 단위) 값은 Supabase `p1_tau_grid` 테이블에 있습니다.

## 기존 ShieldGemma `default` 후보와 대조 결과

기존 `shared_outputs/shieldgemma/judgments_shieldgemma_{dna,jigsaw}.csv`의 `default` 조건 후보(DNA는 유사도 상위 5개, Jigsaw는 2개 전부)와 비교했습니다.

**Jigsaw**: 84.8%는 완전 일치, 15.2%는 BFS 결과가 더 적음(둘 중 하나만 τ 통과) — 기존 ShieldGemma 확률 재사용 가능, 재실행 불필요.

**DNA**: τ=0.02가 낮아 가지치기가 적어(평균 53/61개 생존) 후보 집합 자체는 다르지만, 실제 겹침은 이렇습니다:

| 결과 | 건수 | 비율 |
| --- | ---: | ---: |
| 기존 5개 후보가 BFS 후보에 전부 포함 | 5,252 | 93.2% |
| 일부만 포함 | 374 | 6.6% |
| 하나도 안 겹침 | 8 | 0.1% |

→ **DNA 텍스트 8건만 ShieldGemma 추가 판정이 필요**하고, 나머지 99.9%는 기존 확률을 BFS 결과로 재필터링하면 됩니다. 이 8건의 text_id는 필요하면 추가로 뽑아드릴 수 있습니다.

## 생성 방법

`pipeline/generate_p2_candidates.py` — BFS 로직은 `pipeline/precompute_p1.py`의 `run_bfs`와 동일(같은 코드 재사용).
