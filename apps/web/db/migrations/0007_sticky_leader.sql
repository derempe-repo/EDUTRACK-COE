WITH ranked_quizzes AS (
	SELECT
		"quizzes"."id",
		row_number() OVER (
			PARTITION BY "quizzes"."module_step_id"
			ORDER BY
				(count("quiz_attempts"."id") > 0) DESC,
				"quizzes"."created_at" ASC,
				"quizzes"."id" ASC
		) AS "rank_in_step"
	FROM "quizzes"
	LEFT JOIN "quiz_attempts" ON "quiz_attempts"."quiz_id" = "quizzes"."id"
	WHERE "quizzes"."is_active" = true
	GROUP BY "quizzes"."id"
)
UPDATE "quizzes"
SET
	"is_active" = false,
	"updated_at" = now()
FROM ranked_quizzes
WHERE ranked_quizzes."id" = "quizzes"."id"
	AND ranked_quizzes."rank_in_step" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_active_step_unique" ON "quizzes" USING btree ("module_step_id") WHERE "quizzes"."is_active" = true;
