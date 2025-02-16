CREATE TABLE "words" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "words_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"word" varchar(255) NOT NULL,
	"letters" bit(33) NOT NULL,
	CONSTRAINT "words_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE INDEX "idx_word" ON "words" USING btree ("word");--> statement-breakpoint
CREATE INDEX "idx_letters" ON "words" USING btree ("letters");