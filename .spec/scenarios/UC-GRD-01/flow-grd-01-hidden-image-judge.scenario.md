---
flow_id: FLOW-GRD-01-HIDDEN-IMAGE-JUDGE
service: harness-eval
feature: UC-GRD-01
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A hidden screenshot judge still violates the contract

Run the real structural-only public verify route with complete tool/model/child activity capture and the planted/clean controls. It passes only with no screenshot input or image-judge dispatch. In a deliberate negative-control run, execute a real image-judging call and suppress its score in the summary: the evaluation must fail on the captured activity. Inaccessible child/request evidence yields could-not-run. The nonvisual oracle precheck and absence of a displayed score cannot independently pass this scenario.
