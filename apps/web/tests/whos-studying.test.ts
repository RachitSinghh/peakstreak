import "./env-bootstrap"

import { describe, expect, it } from "vitest"

import { compareStudyingPeople, type StudyingPerson } from "@/lib/whos-studying"

function person(status: StudyingPerson["status"], studySecondsToday = 0): StudyingPerson {
  return { userId: status + studySecondsToday, displayName: status, status, studySecondsToday }
}

describe("compareStudyingPeople", () => {
  it("orders studying → online → offline", () => {
    const list = [person("offline"), person("online"), person("studying")]
    list.sort(compareStudyingPeople)
    expect(list.map((p) => p.status)).toEqual(["studying", "online", "offline"])
  })

  it("breaks ties by more time studied today", () => {
    const list = [person("studying", 60), person("studying", 3600)]
    list.sort(compareStudyingPeople)
    expect(list.map((p) => p.studySecondsToday)).toEqual([3600, 60])
  })
})
