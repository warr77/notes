CREATE EXTENSION If NOT EXISTS "uuid-ossp"
CREATE DATABASE notesspace

-- CREATE TABLE users(
--     user_id uuid PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
--     user_name TEXT NOT NULL ,
--     user_email TEXT NOT NULL ,
--     user_password TEXT NOT NULL ,
-- )

select * from users;
INSERT INTO users (name,email,user_password)VALUES('Adam',"adam@email.com","adam");

CREATE TABLE users(
        id  BIGSERIAL PRIMARY KEY NOT NULL,
        name TEXT NOT NULL ,
        email TEXT NOT NULL ,
        password TEXT NOT NULL ,
        unique(email)
    );

    CREATE TABLE post (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by BIGSERIAL REFERENCES users(id)
    )   ;

    

CREATE TABLE permissions (
    user_id BIGINT REFERENCES users(id),
    post_id INTEGER REFERENCES post(id),
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    id SERIAL UNIQUE
);

ALTER TABLE permissions ADD CONSTRAINT pk_permissions PRIMARY KEY (user_id, post_id);


INSERT INTO permissions (post_id, user_id, can_read,can_update,can_delete)
VALUES (17, 3, true,true,false)
ON CONFLICT (post_id, user_id)
DO UPDATE SET can_read = true;
select * from post;



UPDATE post 
SET content = 'new content' 
WHERE id = 16 
AND EXISTS (SELECT 1 FROM permissions WHERE user_id = 3 AND can_update = true);

DELETE FROM post 
WHERE id = 16 
AND EXISTS (SELECT 1 FROM permissions WHERE user_id = 3 AND can_delete = true);

DELETE FROM permissions 
WHERE user_id = 3 and post_id=15
AND EXISTS (SELECT 1 FROM permissions WHERE user_id = 3 AND can_delete = true) ;


SELECT p.id, p.title, p.content, p.created_at, p.updated_at, p.updated_by, COUNT(*) OVER() AS total_count
,pm.can_read,pm.can_delete,pm.can_update FROM post p
JOIN permissions pm ON p.id = pm.post_id
WHERE pm.user_id = 3 AND pm.can_read = TRUE
ORDER BY p.updated_at DESC
LIMIT 5 OFFSET (1-1)*5;

SELECT * FROM post p
WHERE p.id = {post_id} AND EXISTS (
SELECT 1 FROM permissions
WHERE user_id = {current_user_id} AND post_id = {post_id} AND can_read = true
);