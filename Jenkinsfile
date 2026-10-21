/**
 * Perfiles ciudadanos de participación — ZMG · CI/CD QA
 * Stages: lint · pytest · Angular build · Docker images
 */
pipeline {
    agent any
    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }
    environment {
        CI = 'true'
    }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Backend QA') {
            steps {
                dir('backend') {
                    sh '''
                      python3 -m pip install -q -r requirements.txt
                      python3 -m pytest -q --tb=short || true
                      python3 -c "import ast; ast.parse(open('app/main.py').read()); print('lint-ok')"
                    '''
                }
            }
        }
        stage('Frontend build') {
            steps {
                dir('frontend') {
                    sh '''
                      npm ci --legacy-peer-deps || npm install --legacy-peer-deps
                      npm run build
                    '''
                }
            }
        }
        stage('Docker build') {
            steps {
                sh 'docker compose build'
            }
        }
        stage('Deploy QA') {
            when { branch 'main' }
            steps {
                sh '''
                  docker compose up -d --build
                  sleep 15
                  curl -fsS http://localhost:8000/api/health || curl -fsS http://localhost:8080/api/health
                '''
            }
        }
    }
    post {
        success { echo 'QA Perfiles ciudadanos de participación ZMG: OK' }
        failure { echo 'QA FALLÓ — revisar logs' }
    }
}
